import { Module, OnModuleInit } from '@nestjs/common';
import { PluginRegistryModule, PluginRegistryService } from '../core/plugin-registry';
import { PrismaModule } from '../core/prisma/prisma.module';

// Field types
import { textPlugin } from './field-types/text.plugin';
import { numberPlugin } from './field-types/number.plugin';
import { selectPlugin, multiSelectPlugin } from './field-types/select.plugin';
import { emailPlugin } from './field-types/email.plugin';
import { phonePlugin } from './field-types/phone.plugin';

// Validators
import { requiredPlugin } from './validators/required.plugin';
import { minPlugin } from './validators/min.plugin';
import { maxPlugin } from './validators/max.plugin';
import { regexPlugin } from './validators/regex.plugin';
import { minLengthPlugin } from './validators/min-length.plugin';
import { maxLengthPlugin } from './validators/max-length.plugin';

// Field visibility + section flow + form display
import { defaultVisibilityPlugin, defaultSectionFlowPlugin, allSectionsDisplayPlugin } from '@formdynamic/plugin-contracts';

// Access control
import { publicLinkPlugin } from './access-control/public-link.plugin';
import { IndividualLinkPlugin } from './access-control/individual-link.plugin';
import { OtpAuthPlugin } from './access-control/otp-auth.plugin';
import { OtpAuthController } from './access-control/otp-auth.controller';

// Response hooks
import { webhookPlugin } from './response-hooks/webhook.plugin';

// Exporters
import { csvExporter } from './exporters/csv.exporter';
import { jsonExporter } from './exporters/json.exporter';

@Module({
  imports: [PluginRegistryModule, PrismaModule],
  controllers: [OtpAuthController],
  providers: [IndividualLinkPlugin, OtpAuthPlugin],
})
export class PluginsModule implements OnModuleInit {
  constructor(
    private readonly registry: PluginRegistryService,
    private readonly individualLinkPlugin: IndividualLinkPlugin,
    private readonly otpAuthPlugin: OtpAuthPlugin,
  ) {}

  onModuleInit() {
    // Field types
    this.registry.register(textPlugin);
    this.registry.register(numberPlugin);
    this.registry.register(selectPlugin);
    this.registry.register(multiSelectPlugin);
    this.registry.register(emailPlugin);
    this.registry.register(phonePlugin);

    // Validators
    this.registry.register(requiredPlugin);
    this.registry.register(minPlugin);
    this.registry.register(maxPlugin);
    this.registry.register(regexPlugin);
    this.registry.register(minLengthPlugin);
    this.registry.register(maxLengthPlugin);

    // Field visibility + section flow + form display
    this.registry.register(defaultVisibilityPlugin);
    this.registry.register(defaultSectionFlowPlugin);
    this.registry.register(allSectionsDisplayPlugin);

    // Access control — orden importa: otp-auth escribe verifiedEmail, individual-link lo lee
    this.registry.register(publicLinkPlugin);
    this.registry.register(this.otpAuthPlugin);
    this.registry.register(this.individualLinkPlugin);

    // Response hooks
    this.registry.register(webhookPlugin);

    // Exporters
    this.registry.register(csvExporter);
    this.registry.register(jsonExporter);
  }
}
