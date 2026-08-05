import { OwnerNotifyPlugin } from './owner-notify.plugin';
import type { PrismaService } from '../../core/prisma/prisma.service';
import type { MailerService } from '../../core/mailer/mailer.service';
import type { ResponsePayload } from '@formdynamic/plugin-contracts';

function makePrismaMock() {
  return { form: { findUnique: jest.fn() } };
}

function makeMailerMock() {
  return { send: jest.fn().mockResolvedValue(undefined), sendTemplated: jest.fn().mockResolvedValue(undefined) };
}

const PAYLOAD: ResponsePayload = {
  formId: 'form-1',
  responseId: 'r1',
  answers: {},
  submittedAt: new Date(),
};

describe('OwnerNotifyPlugin', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let mailer: ReturnType<typeof makeMailerMock>;
  let plugin: OwnerNotifyPlugin;

  beforeEach(() => {
    prisma = makePrismaMock();
    mailer = makeMailerMock();
    plugin = new OwnerNotifyPlugin(prisma as unknown as PrismaService, mailer as unknown as MailerService);
  });

  it('manda un mail al owner del form', async () => {
    prisma.form.findUnique.mockResolvedValue({
      id: 'form-1', title: 'Encuesta', owner: { email: 'owner@test.com' },
    });

    const result = await plugin.onResponse(PAYLOAD, {});

    expect(result.success).toBe(true);
    expect(mailer.sendTemplated).toHaveBeenCalledWith(
      'owner@test.com',
      expect.stringContaining('Encuesta'),
      expect.any(String),
      expect.any(String),
    );
  });

  it('falla sin romper si el form no tiene owner', async () => {
    prisma.form.findUnique.mockResolvedValue({ id: 'form-1', title: 'Encuesta', owner: null });

    const result = await plugin.onResponse(PAYLOAD, {});

    expect(result.success).toBe(false);
    expect(mailer.sendTemplated).not.toHaveBeenCalled();
  });

  it('falla sin romper si el form no existe', async () => {
    prisma.form.findUnique.mockResolvedValue(null);

    const result = await plugin.onResponse(PAYLOAD, {});

    expect(result.success).toBe(false);
  });
});
