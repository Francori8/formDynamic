import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PluginRegistryService } from '../plugin-registry/plugin-registry.service';
import type { CreateFormDto, UpdateFormPluginConfigDto, UpdateFormStatusDto, UpdateFormContentDto, FormStatus } from './forms.dto';
import type { Section } from '@formdynamic/plugin-contracts';

const VALID_STATUSES: FormStatus[] = ['DRAFT', 'PUBLISHED', 'CLOSED'];

// Allowed transitions
const TRANSITIONS: Record<FormStatus, FormStatus[]> = {
  DRAFT: ['PUBLISHED'],
  PUBLISHED: ['CLOSED'],
  CLOSED: [],
};

@Injectable()
export class FormsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: PluginRegistryService,
  ) {}

  async create(dto: CreateFormDto, ownerId?: string) {
    for (const section of dto.sections) {
      for (const field of section.fields) {
        this.registry.getFieldType(field.type);
      }
    }

    return this.prisma.form.create({
      data: {
        title: dto.title,
        sections: dto.sections as unknown as object[],
        ...(ownerId ? { ownerId } : {}),
        ...(dto.pluginConfig ? { pluginConfig: dto.pluginConfig as object } : {}),
      },
    });
  }

  async findOne(id: string) {
    const form = await this.prisma.form.findUnique({ where: { id } });
    if (!form) throw new NotFoundException(`Form ${id} not found`);

    const sections = (form.sections as unknown as Section[]).map((section) => ({
      ...section,
      fields: section.fields.map((field) => {
        const plugin = this.registry.getFieldType(field.type);
        return { ...field, schema: plugin.getSchema(field) };
      }),
    }));

    return { ...form, sections };
  }

  async updateContent(id: string, dto: UpdateFormContentDto, ownerId: string) {
    const form = await this.prisma.form.findUnique({ where: { id } });
    if (!form) throw new NotFoundException(`Form ${id} not found`);
    if (form.ownerId !== ownerId) throw new BadRequestException('No tenes permiso para modificar este formulario');
    if (form.status !== 'DRAFT') throw new BadRequestException('Solo se puede editar un formulario en borrador');

    if (dto.sections) {
      for (const section of dto.sections) {
        for (const field of section.fields) {
          this.registry.getFieldType(field.type);
        }
      }
    }

    return this.prisma.form.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.sections !== undefined ? { sections: dto.sections as unknown as object[] } : {}),
      },
      select: { id: true, title: true, sections: true },
    });
  }

  async updateStatus(id: string, dto: UpdateFormStatusDto, ownerId: string) {
    const form = await this.prisma.form.findUnique({ where: { id } });
    if (!form) throw new NotFoundException(`Form ${id} not found`);
    if (form.ownerId !== ownerId) throw new BadRequestException('No tenes permiso para modificar este formulario');

    if (!VALID_STATUSES.includes(dto.status)) {
      throw new BadRequestException(`Estado invalido: ${dto.status}`);
    }

    const currentStatus = form.status as FormStatus;
    const allowed = TRANSITIONS[currentStatus];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(`No se puede pasar de ${currentStatus} a ${dto.status}`);
    }

    return this.prisma.form.update({
      where: { id },
      data: { status: dto.status },
      select: { id: true, status: true },
    });
  }

  async updatePluginConfig(id: string, dto: UpdateFormPluginConfigDto, ownerId: string) {
    const form = await this.prisma.form.findUnique({ where: { id } });
    if (!form) throw new NotFoundException(`Form ${id} not found`);
    if (form.ownerId !== ownerId) throw new BadRequestException('No tenes permiso para modificar este formulario');
    if (form.status !== 'DRAFT') throw new BadRequestException('Solo se puede modificar un formulario en borrador');

    return this.prisma.form.update({
      where: { id },
      data: { pluginConfig: dto.pluginConfig as object },
      select: { id: true, pluginConfig: true },
    });
  }

  async findAll(ownerId?: string) {
    return this.prisma.form.findMany({
      where: ownerId ? { ownerId } : undefined,
      select: { id: true, title: true, createdAt: true, status: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
