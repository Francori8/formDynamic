import { RespondentConfirmationPlugin } from './respondent-confirmation.plugin';
import type { MailerService } from '../../core/mailer/mailer.service';
import type { ResponsePayload } from '@formdynamic/plugin-contracts';

function makeMailerMock() {
  return { send: jest.fn().mockResolvedValue(undefined), sendTemplated: jest.fn().mockResolvedValue(undefined) };
}

const BASE_PAYLOAD: ResponsePayload = {
  formId: 'form-1',
  responseId: 'r1',
  answers: {},
  submittedAt: new Date(),
};

describe('RespondentConfirmationPlugin', () => {
  let mailer: ReturnType<typeof makeMailerMock>;
  let plugin: RespondentConfirmationPlugin;

  beforeEach(() => {
    mailer = makeMailerMock();
    plugin = new RespondentConfirmationPlugin(mailer as unknown as MailerService);
  });

  it('no manda mail ni falla si no hay respondent (ej. public-link)', async () => {
    const result = await plugin.onResponse(BASE_PAYLOAD, {});
    expect(result.success).toBe(true);
    expect(mailer.sendTemplated).not.toHaveBeenCalled();
  });

  it('no manda mail si el respondent no es de tipo email', async () => {
    const result = await plugin.onResponse(
      { ...BASE_PAYLOAD, respondent: { id: 'user-123', type: 'user-id', plugin: 'some-plugin' } },
      {},
    );
    expect(result.success).toBe(true);
    expect(mailer.sendTemplated).not.toHaveBeenCalled();
  });

  it('manda confirmación al email verificado', async () => {
    const result = await plugin.onResponse(
      { ...BASE_PAYLOAD, respondent: { id: 'user@test.com', type: 'email', plugin: 'otp-auth' } },
      {},
    );
    expect(result.success).toBe(true);
    expect(mailer.sendTemplated).toHaveBeenCalledWith('user@test.com', expect.any(String), expect.any(String), expect.any(String));
  });

  it('no depende de qué plugin verificó el email — cualquier respondent tipo email dispara la confirmación', async () => {
    const result = await plugin.onResponse(
      { ...BASE_PAYLOAD, respondent: { id: 'user@test.com', type: 'email', plugin: 'some-future-plugin' } },
      {},
    );
    expect(result.success).toBe(true);
    expect(mailer.sendTemplated).toHaveBeenCalled();
  });
});
