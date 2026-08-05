import { Injectable } from '@nestjs/common';
import type { ResponseHookPlugin, HookResult, ResponsePayload } from '@formdynamic/plugin-contracts';
import { MailerService } from '../../core/mailer/mailer.service';

@Injectable()
export class RespondentConfirmationPlugin implements ResponseHookPlugin {
  readonly name = 'respondent-confirmation';
  readonly type = 'response-hook' as const;

  constructor(private readonly mailer: MailerService) {}

  async onResponse(payload: ResponsePayload): Promise<HookResult> {
    // Solo tiene sentido si el acceso identificó al respondente por email —
    // con public-link no hay a quién confirmarle, y no es un error.
    if (!payload.respondent || payload.respondent.type !== 'email') {
      return { success: true };
    }

    await this.mailer.sendTemplated(
      payload.respondent.id,
      'Recibimos tu respuesta',
      'Respuesta confirmada',
      `<p>Confirmamos que recibimos tu respuesta al formulario.</p>`,
    );

    return { success: true };
  }
}
