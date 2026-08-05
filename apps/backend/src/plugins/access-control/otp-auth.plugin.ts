import { Injectable } from '@nestjs/common';
import type { AccessControlPlugin, AccessContext, AccessResult } from '@formdynamic/plugin-contracts';
import { PrismaService } from '../../core/prisma/prisma.service';
import { MailerService } from '../../core/mailer/mailer.service';
import { randomInt } from 'crypto';

const OTP_TTL_MINUTES = 10;

@Injectable()
export class OtpAuthPlugin implements AccessControlPlugin {
  readonly name = 'otp-auth';
  readonly type = 'access-control' as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  async checkAccess(context: AccessContext, config?: unknown): Promise<AccessResult> {
    // Con link: el link individual siempre exige OTP (comportamiento histórico).
    // Sin link: solo exige OTP si el owner activó explícitamente este plugin en pluginConfig
    // — si no, no aplica (deja pasar, otro plugin o el fallback público decide).
    const isEnabledForOpenForm = (config as { enabled?: boolean } | undefined)?.enabled === true;
    if (!context.link && !isEnabledForOpenForm) {
      return { allowed: true };
    }

    // El email y el código OTP vienen en el contexto extendido desde el request
    const ctx = context as AccessContext & { email?: string; otpToken?: string };
    const otpToken = ctx.otpToken;
    const email = ctx.email;

    if (!email || !otpToken) {
      return {
        allowed: false,
        reason: context.link
          ? 'Se requiere verificación OTP para acceder a este link'
          : 'Se requiere verificación OTP para responder este formulario',
      };
    }

    const otp = await this.prisma.otpCode.findFirst({
      where: context.link
        ? { email: email.toLowerCase().trim(), linkId: context.link.id, code: otpToken, usedAt: null, expiresAt: { gt: new Date() } }
        : { email: email.toLowerCase().trim(), formId: context.formId, code: otpToken, usedAt: null, expiresAt: { gt: new Date() } },
    });

    if (!otp) {
      return { allowed: false, reason: 'Código OTP inválido o expirado' };
    }

    // Marcar como usado
    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    });

    // Escribir el email verificado en el contexto para que individual-link lo lea
    (context as AccessContext & { verifiedEmail?: string }).verifiedEmail = email.toLowerCase().trim();

    return {
      allowed: true,
      respondent: { id: email.toLowerCase().trim(), type: 'email', plugin: this.name },
    };
  }

  async requestOtp(email: string, target: { linkId: string } | { formId: string }): Promise<void> {
    const where = 'linkId' in target ? { linkId: target.linkId } : { formId: target.formId };

    // Invalidar OTPs anteriores del mismo email+destino
    await this.prisma.otpCode.updateMany({
      where: { email: email.toLowerCase().trim(), ...where, usedAt: null },
      data: { usedAt: new Date() },
    });

    const code = randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await this.prisma.otpCode.create({
      data: { email: email.toLowerCase().trim(), ...where, code, expiresAt },
    });

    await this.mailer.sendTemplated(
      email.toLowerCase().trim(),
      'Tu código de acceso',
      'Verificación de identidad',
      `<p>Tu código de acceso es: <strong style="font-size:1.5em;letter-spacing:0.2em">${code}</strong></p><p>Válido por ${OTP_TTL_MINUTES} minutos.</p>`,
    );
  }
}
