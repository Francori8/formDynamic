import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  private readonly from = process.env.RESEND_FROM ?? 'onboarding@resend.dev';

  async send(to: string, subject: string, html: string): Promise<void> {
    if (this.resend) {
      await this.resend.emails.send({ from: this.from, to, subject, html });
      return;
    }
    this.logger.log(`[MAIL] Para ${to}: ${subject}\n${html}`);
  }
}
