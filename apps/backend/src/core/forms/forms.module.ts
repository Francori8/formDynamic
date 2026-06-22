import { Module } from '@nestjs/common';
import { FormsController } from './forms.controller';
import { FormsService } from './forms.service';
import { PluginRegistryModule } from '../plugin-registry/plugin-registry.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PluginRegistryModule, AuthModule],
  controllers: [FormsController],
  providers: [FormsService],
})
export class FormsModule {}
