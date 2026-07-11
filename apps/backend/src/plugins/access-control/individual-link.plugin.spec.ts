import { IndividualLinkPlugin } from './individual-link.plugin';
import type { PrismaService } from '../../core/prisma/prisma.service';
import type { AccessContext } from '@formdynamic/plugin-contracts';

function makePrismaMock() {
  return { formLinkEmail: { findMany: jest.fn() } };
}

describe('IndividualLinkPlugin', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let plugin: IndividualLinkPlugin;

  beforeEach(() => {
    prisma = makePrismaMock();
    plugin = new IndividualLinkPlugin(prisma as unknown as PrismaService);
  });

  it('permite acceso si no hay token/link (no aplica)', async () => {
    const result = await plugin.checkAccess({ formId: 'f1' });
    expect(result.allowed).toBe(true);
  });

  it('deniega si el link alcanzó su cupo máximo', async () => {
    const context: AccessContext = {
      formId: 'f1', token: 'tok',
      link: { id: 'l1', maxResponses: 5, responseCount: 5 },
    };
    const result = await plugin.checkAccess(context);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/límite de respuestas/);
  });

  it('permite acceso libre si el link no tiene emails configurados', async () => {
    prisma.formLinkEmail.findMany.mockResolvedValue([]);
    const context: AccessContext = {
      formId: 'f1', token: 'tok',
      link: { id: 'l1', maxResponses: null, responseCount: 0 },
    };
    const result = await plugin.checkAccess(context);
    expect(result.allowed).toBe(true);
  });

  it('deniega si hay emails configurados pero no hay verifiedEmail', async () => {
    prisma.formLinkEmail.findMany.mockResolvedValue([{ email: 'a@test.com' }]);
    const context: AccessContext = {
      formId: 'f1', token: 'tok',
      link: { id: 'l1', maxResponses: null, responseCount: 0 },
    };
    const result = await plugin.checkAccess(context);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/verificación de identidad/);
  });

  it('deniega si el verifiedEmail no está en la lista permitida', async () => {
    prisma.formLinkEmail.findMany.mockResolvedValue([{ email: 'a@test.com' }]);
    const context = {
      formId: 'f1', token: 'tok',
      link: { id: 'l1', maxResponses: null, responseCount: 0 },
      verifiedEmail: 'b@test.com',
    } as AccessContext;
    const result = await plugin.checkAccess(context);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/no tiene acceso/);
  });

  it('permite acceso y devuelve respondent si el verifiedEmail está permitido (case-insensitive)', async () => {
    prisma.formLinkEmail.findMany.mockResolvedValue([{ email: 'A@Test.com' }]);
    const context = {
      formId: 'f1', token: 'tok',
      link: { id: 'l1', maxResponses: null, responseCount: 0 },
      verifiedEmail: 'a@test.com',
    } as AccessContext;
    const result = await plugin.checkAccess(context);
    expect(result.allowed).toBe(true);
    expect(result.respondent).toEqual({ id: 'a@test.com', type: 'email', plugin: 'individual-link' });
  });
});
