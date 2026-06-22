import { Module } from '@nestjs/common';
import { PrismaModule } from './core/prisma/prisma.module';
import { PluginRegistryModule } from './core/plugin-registry';
import { PluginsModule } from './plugins/plugins.module';
import { FormsModule } from './core/forms/forms.module';
import { FormLinksModule } from './core/form-links/form-links.module';
import { PluginsControllerModule } from './core/plugins/plugins.controller.module';
import { ResponsesModule } from './core/responses/responses.module';
import { AuthModule } from './core/auth/auth.module';

@Module({
  imports: [PrismaModule, PluginRegistryModule, PluginsModule, FormsModule, FormLinksModule, PluginsControllerModule, ResponsesModule, AuthModule],
})
export class AppModule {}
