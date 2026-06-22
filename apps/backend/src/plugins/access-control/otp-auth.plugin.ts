import { Injectable, Logger } from '@nestjs/common';
import type { AccessControlPlugin, AccessContext, AccessResult } from '@formdynamic/plugin-contracts';
import { PrismaService } from '../../core/prisma/prisma.service';
import { randomInt } from 'crypto';
import { Resend } from 'resend';

const OTP_TTL_MINUTES = 10;

@Injectable()
export class OtpAuthPlugin implements AccessControlPlugin {
  readonly name = 'otp-auth';
  readonly type = 'access-control' as const;

  private readonly logger = new Logger(OtpAuthPlugin.name);
  private readonly resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  private readonly from = process.env.RESEND_FROM ?? 'onboarding@resend.dev';

  constructor(private readonly prisma: PrismaService) {}

  async checkAccess(context: AccessContext): Promise<AccessResult> {
    // Solo actúa si hay un link — sin link no hay verificación OTP
    if (!context.link) {
      return { allowed: true };
    }

    // El email y el código OTP vienen en el contexto extendido desde el request
    const ctx = context as AccessContext & { email?: string; otpToken?: string };
    const otpToken = ctx.otpToken;
    const email = ctx.email;

    if (!email || !otpToken) {
      return { allowed: false, reason: 'Se requiere verificación OTP para acceder a este link' };
    }

    const otp = await this.prisma.otpCode.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        linkId: context.link.id,
        code: otpToken,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
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

    return { allowed: true };
  }

  async requestOtp(email: string, linkId: string): Promise<void> {
    // Invalidar OTPs anteriores del mismo email+link
    await this.prisma.otpCode.updateMany({
      where: { email: email.toLowerCase().trim(), linkId, usedAt: null },
      data: { usedAt: new Date() },
    });

    const code = randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await this.prisma.otpCode.create({
      data: { email: email.toLowerCase().trim(), linkId, code, expiresAt },
    });

    if (this.resend) {
      await this.resend.emails.send({
        from: this.from,
        to: email.toLowerCase().trim(),
        subject: 'Tu código de acceso',
        html: `<p>Tu código de acceso es: <strong style="font-size:1.5em;letter-spacing:0.2em">${code}</strong></p><p>Válido por ${OTP_TTL_MINUTES} minutos.</p>`,
      });
    } else {
      this.logger.log(`[OTP] Para ${email} en link ${linkId}: ${code} (válido ${OTP_TTL_MINUTES} min)`);
    }
  }
}
