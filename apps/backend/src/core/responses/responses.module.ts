import { Module } from '@nestjs/common';
import { ResponsesController } from './responses.controller';
import { ResponsesService } from './responses.service';
import { PluginRegistryModule } from '../plugin-registry/plugin-registry.module';

@Module({
  imports: [PluginRegistryModule],
  controllers: [ResponsesController],
  providers: [ResponsesService],
})
export class ResponsesModule {}
