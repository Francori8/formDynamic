import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { renderEmail } from './email-template';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  private readonly from = process.env.RESEND_FROM ?? 'onboarding@resend.dev';
  // Copia oculta de cada mail enviado a una casilla de auditoría propia — opcional, no rompe nada si no está seteada
  private readonly bcc = process.env.RESEND_BCC;

  async send(to: string, subject: string, html: string): Promise<void> {
    if (this.resend) {
      await this.resend.emails.send({
        from: this.from,
        to,
        subject,
        html,
        ...(this.bcc ? { bcc: this.bcc } : {}),
      });
      return;
    }
    this.logger.log(`[MAIL] Para ${to}: ${subject}\n${html}`);
  }

  // Envuelve bodyHtml en el layout compartido (header/footer de marca) antes de mandarlo —
  // usar esto en vez de send() para cualquier mail nuevo, así todos se ven consistentes.
  async sendTemplated(to: string, subject: string, title: string, bodyHtml: string): Promise<void> {
    await this.send(to, subject, renderEmail(title, bodyHtml));
  }
}
