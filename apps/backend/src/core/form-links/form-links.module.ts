import { Module } from '@nestjs/common';
import { FormLinksController, PublicLinkController } from './form-links.controller';
import { FormLinksService } from './form-links.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [FormLinksController, PublicLinkController],
  providers: [FormLinksService],
  exports: [FormLinksService],
})
export class FormLinksModule {}
