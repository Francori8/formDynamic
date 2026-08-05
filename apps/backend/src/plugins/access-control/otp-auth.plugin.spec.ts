import { OtpAuthPlugin } from './otp-auth.plugin';
import type { PrismaService } from '../../core/prisma/prisma.service';
import type { MailerService } from '../../core/mailer/mailer.service';
import type { AccessContext } from '@formdynamic/plugin-contracts';

function makePrismaMock() {
  return {
    otpCode: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
  };
}

function makeMailerMock() {
  return { send: jest.fn().mockResolvedValue(undefined), sendTemplated: jest.fn().mockResolvedValue(undefined) };
}

describe('OtpAuthPlugin', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let mailer: ReturnType<typeof makeMailerMock>;
  let plugin: OtpAuthPlugin;

  beforeEach(() => {
    prisma = makePrismaMock();
    mailer = makeMailerMock();
    plugin = new OtpAuthPlugin(prisma as unknown as PrismaService, mailer as unknown as MailerService);
  });

  describe('checkAccess', () => {
    it('permite acceso si no hay link y el plugin no está activado para el form (no aplica)', async () => {
      const result = await plugin.checkAccess({ formId: 'f1' });
      expect(result.allowed).toBe(true);
    });

    it('permite acceso si no hay link y config.enabled es false', async () => {
      const result = await plugin.checkAccess({ formId: 'f1' }, { enabled: false });
      expect(result.allowed).toBe(true);
    });

    it('sin link, con config.enabled true, exige verificación OTP', async () => {
      const result = await plugin.checkAccess({ formId: 'f1' }, { enabled: true });
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/verificación OTP/);
    });

    it('sin link, con config.enabled true y código válido, permite y devuelve respondent', async () => {
      prisma.otpCode.findFirst.mockResolvedValue({ id: 'otp-1' });
      const context = { formId: 'f1', email: 'User@Test.com', otpToken: '123456' } as AccessContext & { email: string; otpToken: string };

      const result = await plugin.checkAccess(context, { enabled: true });

      expect(result.allowed).toBe(true);
      expect(prisma.otpCode.findFirst).toHaveBeenCalledWith({
        where: { email: 'user@test.com', formId: 'f1', code: '123456', usedAt: null, expiresAt: { gt: expect.any(Date) } },
      });
      expect(result.respondent).toEqual({ id: 'user@test.com', type: 'email', plugin: 'otp-auth' });
    });

    it('deniega si hay link pero falta email u otpToken', async () => {
      const context: AccessContext = { formId: 'f1', link: { id: 'l1', maxResponses: null, responseCount: 0 } };
      const result = await plugin.checkAccess(context);
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/verificación OTP/);
    });

    it('deniega si el código no existe/expiró/ya se usó', async () => {
      prisma.otpCode.findFirst.mockResolvedValue(null);
      const context = {
        formId: 'f1',
        link: { id: 'l1', maxResponses: null, responseCount: 0 },
        email: 'user@test.com',
        otpToken: '123456',
      } as AccessContext & { email: string; otpToken: string };

      const result = await plugin.checkAccess(context);
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/inválido o expirado/);
    });

    it('permite acceso con código válido, lo marca usado y escribe verifiedEmail en el contexto', async () => {
      prisma.otpCode.findFirst.mockResolvedValue({ id: 'otp-1' });
      const context = {
        formId: 'f1',
        link: { id: 'l1', maxResponses: null, responseCount: 0 },
        email: 'User@Test.com',
        otpToken: '123456',
      } as AccessContext & { email: string; otpToken: string };

      const result = await plugin.checkAccess(context);

      expect(result.allowed).toBe(true);
      expect(prisma.otpCode.update).toHaveBeenCalledWith({
        where: { id: 'otp-1' },
        data: { usedAt: expect.any(Date) },
      });
      expect((context as unknown as { verifiedEmail?: string }).verifiedEmail).toBe('user@test.com');
    });
  });

  describe('requestOtp', () => {
    it('con linkId — invalida OTPs anteriores, crea uno nuevo y manda el mail', async () => {
      await plugin.requestOtp('User@Test.com', { linkId: 'link-1' });

      expect(prisma.otpCode.updateMany).toHaveBeenCalledWith({
        where: { email: 'user@test.com', linkId: 'link-1', usedAt: null },
        data: { usedAt: expect.any(Date) },
      });
      expect(prisma.otpCode.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ email: 'user@test.com', linkId: 'link-1' }),
      });
      expect(mailer.sendTemplated).toHaveBeenCalledWith(
        'user@test.com',
        expect.stringContaining('código'),
        expect.any(String),
        expect.stringContaining('strong'),
      );
    });

    it('con formId — invalida OTPs anteriores, crea uno nuevo y manda el mail', async () => {
      await plugin.requestOtp('user@test.com', { formId: 'form-1' });

      expect(prisma.otpCode.updateMany).toHaveBeenCalledWith({
        where: { email: 'user@test.com', formId: 'form-1', usedAt: null },
        data: { usedAt: expect.any(Date) },
      });
      expect(prisma.otpCode.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ email: 'user@test.com', formId: 'form-1' }),
      });
    });

    it('genera un código de 6 dígitos', async () => {
      await plugin.requestOtp('user@test.com', { linkId: 'link-1' });
      const createCall = prisma.otpCode.create.mock.calls[0][0];
      expect(createCall.data.code).toMatch(/^\d{6}$/);
    });
  });
});
