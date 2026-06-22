import { Injectable } from '@nestjs/common';
import type { AccessControlPlugin, AccessContext, AccessResult } from '@formdynamic/plugin-contracts';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class IndividualLinkPlugin implements AccessControlPlugin {
  readonly name = 'individual-link';
  readonly type = 'access-control' as const;

  constructor(private readonly prisma: PrismaService) {}

  async checkAccess(context: AccessContext): Promise<AccessResult> {
    // Este plugin solo actúa cuando se accede por un FormLink (hay token y link resuelto)
    if (!context.token || !context.link) {
      return { allowed: true };
    }

    const link = context.link;

    // Verificar cupo total del link
    if (link.maxResponses !== null && link.responseCount >= link.maxResponses) {
      return { allowed: false, reason: 'Este link ha alcanzado el límite de respuestas' };
    }

    // Verificar si el link tiene emails permitidos
    const emailEntries = await this.prisma.formLinkEmail.findMany({
      where: { linkId: link.id },
    });

    // Si no hay emails configurados, el link es libre (sin restricción de email)
    if (emailEntries.length === 0) {
      return { allowed: true };
    }

    // Si hay emails configurados, el respondente debe haber sido verificado por otp-auth
    // El respondent lo pone otp-auth en el AccessContext — pero AccessContext no lo transporta.
    // La verificación de identidad la hace otp-auth antes que este plugin.
    // Este plugin solo valida que el email verificado esté en la lista permitida.
    // El email verificado lo escribe otp-auth en context.verifiedEmail antes de que este plugin corra
    const verifiedEmail = context.verifiedEmail;

    if (!verifiedEmail) {
      return { allowed: false, reason: 'Este link requiere verificación de identidad' };
    }

    const allowed = emailEntries.some(
      (e) => e.email.toLowerCase() === verifiedEmail.toLowerCase(),
    );

    if (!allowed) {
      return { allowed: false, reason: 'Tu email no tiene acceso a este link' };
    }

    return {
      allowed: true,
      respondent: {
        id: verifiedEmail,
        type: 'email',
        plugin: this.name,
      },
    };
  }
}
