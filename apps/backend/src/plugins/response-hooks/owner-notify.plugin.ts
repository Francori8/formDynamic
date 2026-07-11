import { Injectable } from '@nestjs/common';
import type { ResponseHookPlugin, HookResult, ResponsePayload } from '@formdynamic/plugin-contracts';
import { PrismaService } from '../../core/prisma/prisma.service';
import { MailerService } from '../../core/mailer/mailer.service';

@Injectable()
export class OwnerNotifyPlugin implements ResponseHookPlugin {
  readonly name = 'owner-notify';
  readonly type = 'response-hook' as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  async onResponse(payload: ResponsePayload): Promise<HookResult> {
    const form = await this.prisma.form.findUnique({
      where: { id: payload.formId },
      include: { owner: true },
    });

    if (!form?.owner) return { success: false, error: 'Formulario sin dueño registrado' };

    await this.mailer.send(
      form.owner.email,
      `Nueva respuesta en "${form.title}"`,
      `<p>Tu formulario <strong>${form.title}</strong> recibio una nueva respuesta.</p>`,
    );

    return { success: true };
  }
}
