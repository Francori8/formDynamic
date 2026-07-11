import { Test } from '@nestjs/testing';
import { PluginRegistryModule, PluginRegistryService } from '../core/plugin-registry';
import { PluginsModule } from './plugins.module';
import { PrismaService } from '../core/prisma/prisma.service';
import { MailerModule } from '../core/mailer/mailer.module';
import { MailerService } from '../core/mailer/mailer.service';

// Nombres reales que plugins.module.ts registra al arrancar — este test detecta
// si alguien agrega/renombra un plugin y se olvida de registrarlo (o al revés).
const EXPECTED = {
  'field-type': ['text', 'number', 'select', 'multi-select', 'email', 'phone'],
  validator: ['required', 'min', 'max', 'regex', 'min-length', 'max-length'],
  'field-visibility': ['default-visibility'],
  'section-flow': ['default-section-flow'],
  'form-display': ['all-sections'],
  'access-control': ['public-link', 'otp-auth', 'individual-link'],
  'response-hook': ['webhook', 'owner-notify', 'respondent-confirmation'],
  exporter: ['csv', 'json'],
} as const;

describe('PluginsModule (integración real, sin mocks de plugins)', () => {
  it('registra todos los plugins reales del proyecto al arrancar', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PluginRegistryModule, MailerModule, PluginsModule],
    })
      .overrideProvider(PrismaService)
      .useValue({}) // no se llama ningún método de Prisma solo con arrancar el módulo
      .overrideProvider(MailerService)
      .useValue({ send: jest.fn() })
      .compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const registry = app.get(PluginRegistryService);

    for (const [type, names] of Object.entries(EXPECTED)) {
      expect(registry.listByType(type as never).sort()).toEqual([...names].sort());
    }

    await app.close();
  });

  it('un form puede activar cualquier response-hook registrado por su nombre', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PluginRegistryModule, MailerModule, PluginsModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    const app = moduleRef.createNestApplication();
    await app.init();
    const registry = app.get(PluginRegistryService);

    // Simula lo que hace ResponsesService.fireHooks: el owner activa un plugin en
    // pluginConfig por nombre, y el core lo debe poder resolver sin conocerlo de antemano.
    const pluginConfig = { 'owner-notify': { enabled: true } };
    const activePlugins = registry
      .getResponseHookPlugins()
      .filter((p) => pluginConfig[p.name as keyof typeof pluginConfig]?.enabled);

    expect(activePlugins.map((p) => p.name)).toEqual(['owner-notify']);

    await app.close();
  });
});
