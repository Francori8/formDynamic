import { Module } from '@nestjs/common';
import { PluginsController } from './plugins.controller';
import { PluginRegistryModule } from '../plugin-registry/plugin-registry.module';

@Module({
  imports: [PluginRegistryModule],
  controllers: [PluginsController],
})
export class PluginsControllerModule {}
