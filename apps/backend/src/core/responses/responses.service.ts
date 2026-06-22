import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PluginRegistryService } from '../plugin-registry/plugin-registry.service';
import type { Section, FieldConfig, ResponsePayload, Respondent, AccessContext } from '@formdynamic/plugin-contracts';

interface PluginConfig {
  webhook?: { enabled: boolean; url?: string };
  [key: string]: unknown;
}

interface SubmitOptions {
  linkToken?: string;
  email?: string;
  otpToken?: string;
  ipAddress?: string;
}

@Injectable()
export class ResponsesService {
  private readonly logger = new Logger(ResponsesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: PluginRegistryService,
  ) {}

  async submit(formId: string, answers: Record<string, unknown>, options: SubmitOptions = {}) {
    const form = await this.prisma.form.findUnique({ where: { id: formId } });
    if (!form) throw new NotFoundException(`Form ${formId} not found`);

    if (form.status !== 'PUBLISHED') {
      throw new BadRequestException(
        form.status === 'DRAFT'
          ? 'Este formulario aun no fue publicado'
          : 'Este formulario ya no acepta respuestas',
      );
    }

    // Resolver link si se proveyó un token
    let resolvedLink: { id: string; maxResponses: number | null; responseCount: number } | undefined;
    if (options.linkToken) {
      const link = await this.prisma.formLink.findUnique({ where: { token: options.linkToken } });
      if (!link || link.formId !== formId) throw new NotFoundException('Link no encontrado');
      if (link.expiresAt && link.expiresAt < new Date()) throw new BadRequestException('Este link ha expirado');
      resolvedLink = { id: link.id, maxResponses: link.maxResponses, responseCount: link.responseCount };
    }

    // Armar AccessContext y correr plugins de acceso
    const accessContext: AccessContext & { email?: string; otpToken?: string } = {
      formId,
      token: options.linkToken,
      link: resolvedLink,
      ipAddress: options.ipAddress,
      email: options.email,
      otpToken: options.otpToken,
    };

    const accessPlugins = this.registry.getAccessControlPlugins();
    let respondent: Respondent | undefined;

    for (const plugin of accessPlugins) {
      const result = await plugin.checkAccess(accessContext);
      if (!result.allowed) {
        throw new ForbiddenException(result.reason ?? 'Acceso denegado');
      }
      if (result.respondent) {
        respondent = result.respondent;
      }
    }

    const sections = form.sections as unknown as Section[];
    const errors: Record<string, string> = {};
    const visibilityPlugins = this.registry.getFieldVisibilityPlugins();
    const visitedSections = this.registry.getVisitedSectionIds(sections, answers);

    for (const section of sections) {
      // Saltear secciones que el flujo no recorrió
      if (!visitedSections.has(section.id)) continue;

      for (const field of section.fields) {
        // Saltear campos ocultos — si tiene condición de visibilidad y no se cumple, no se valida
        if (field.visibility && visibilityPlugins.length > 0) {
          const { visible } = visibilityPlugins[0].evaluate(field.visibility, answers);
          if (!visible) continue;
        }

        const value = answers[field.id];

        // Validación implícita del tipo de campo (ej: email, phone)
        const fieldType = this.registry.getFieldType(field.type);
        if (fieldType.validate) {
          const result = fieldType.validate(value);
          if (!result.valid) {
            errors[field.id] = result.error ?? 'Valor invalido para este tipo de campo';
            continue;
          }
        }

        for (const validatorConfig of field.validators) {
          const validator = this.registry.getValidator(validatorConfig.name);
          const result = validator.validate(value, validatorConfig.config ?? {});
          if (!result.valid) {
            errors[field.id] = result.error ?? 'Campo invalido';
            break;
          }
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new BadRequestException({ message: 'Errores de validacion', errors });
    }

    const response = await this.prisma.response.create({
      data: {
        formId,
        answers: answers as object,
        linkId: resolvedLink?.id ?? null,
        respondent: respondent ? (respondent as object) : undefined,
      },
    });

    // Incrementar contador del link si aplica
    if (resolvedLink) {
      await this.prisma.formLink.update({
        where: { id: resolvedLink.id },
        data: { responseCount: { increment: 1 } },
      });
    }

    // Fire response hooks — async, non-blocking, errors don't affect the response
    this.fireHooks(form.id, form.pluginConfig as PluginConfig | null, {
      formId: form.id,
      responseId: response.id,
      answers,
      submittedAt: response.submittedAt,
    }).catch((err) => this.logger.error('Response hook error', err));

    return response;
  }

  private async fireHooks(
    formId: string,
    pluginConfig: PluginConfig | null,
    payload: ResponsePayload,
  ) {
    if (!pluginConfig) return;

    if (pluginConfig.webhook?.enabled && pluginConfig.webhook.url) {
      try {
        const plugin = this.registry.getResponseHook('webhook');
        const result = await plugin.onResponse(payload, { url: pluginConfig.webhook.url });
        if (!result.success) {
          this.logger.warn(`Webhook failed for form ${formId}: ${result.error}`);
        }
      } catch (err) {
        this.logger.error(`Webhook plugin threw for form ${formId}`, err);
      }
    }
  }

  async exportResponses(formId: string, format: string) {
    const form = await this.prisma.form.findUnique({ where: { id: formId } });
    if (!form) throw new NotFoundException(`Form ${formId} not found`);

    const responses = await this.prisma.response.findMany({
      where: { formId },
      orderBy: { submittedAt: 'desc' },
    });

    const sections = form.sections as unknown as Section[];
    const exporter = this.registry.getExporter(format);

    return exporter.export({
      form: { id: form.id, title: form.title, sections },
      responses: responses.map((r) => ({
        formId: form.id,
        responseId: r.id,
        submittedAt: r.submittedAt,
        answers: r.answers as Record<string, unknown>,
      })),
    });
  }

  async findByForm(formId: string) {
    const form = await this.prisma.form.findUnique({ where: { id: formId } });
    if (!form) throw new NotFoundException(`Form ${formId} not found`);

    const responses = await this.prisma.response.findMany({
      where: { formId },
      orderBy: { submittedAt: 'desc' },
    });

    const sections = form.sections as unknown as Section[];
    const fieldMap = new Map<string, FieldConfig>();
    for (const section of sections) {
      for (const field of section.fields) {
        fieldMap.set(field.id, field);
      }
    }

    return {
      form: { id: form.id, title: form.title },
      fields: Array.from(fieldMap.values()).map((f) => ({ id: f.id, label: f.label, type: f.type })),
      responses: responses.map((r) => ({
        id: r.id,
        submittedAt: r.submittedAt,
        answers: r.answers,
        respondent: r.respondent ?? null,
      })),
    };
  }
}
