import { Body, Controller, Delete, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { FormLinksService } from './form-links.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

type AuthRequest = { user: { userId: string } };

@Controller('forms/:formId/links')
export class FormLinksController {
  constructor(private readonly formLinksService: FormLinksService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Param('formId') formId: string,
    @Body() dto: { label?: string; maxResponses?: number | null; expiresAt?: string | null },
    @Request() req: AuthRequest,
  ) {
    return this.formLinksService.create(formId, req.user.userId, {
      label: dto.label,
      maxResponses: dto.maxResponses,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Param('formId') formId: string, @Request() req: AuthRequest) {
    return this.formLinksService.findByForm(formId, req.user.userId);
  }

  @Delete(':linkId')
  @UseGuards(JwtAuthGuard)
  revoke(@Param('linkId') linkId: string, @Request() req: AuthRequest) {
    return this.formLinksService.revoke(linkId, req.user.userId);
  }

  @Get(':linkId/emails')
  @UseGuards(JwtAuthGuard)
  getEmails(@Param('linkId') linkId: string, @Request() req: AuthRequest) {
    return this.formLinksService.getAllowedEmails(linkId, req.user.userId);
  }

  @Post(':linkId/emails')
  @UseGuards(JwtAuthGuard)
  setEmails(
    @Param('linkId') linkId: string,
    @Body() body: { emails: string[] },
    @Request() req: AuthRequest,
  ) {
    return this.formLinksService.setAllowedEmails(linkId, req.user.userId, body.emails);
  }
}

// Controlador público — resuelve un link por token (sin auth)
import { Controller as PublicController, Get as PublicGet, Param as PublicParam } from '@nestjs/common';

@PublicController('l')
export class PublicLinkController {
  constructor(private readonly formLinksService: FormLinksService) {}

  @PublicGet(':token')
  resolve(@PublicParam('token') token: string) {
    return this.formLinksService.resolveByToken(token);
  }
}
