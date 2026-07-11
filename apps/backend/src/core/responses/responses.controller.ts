import { Body, Controller, Get, Param, Post, Req, Request, Res, UseGuards } from '@nestjs/common';
import type { Request as ExpressRequest, Response } from 'express';
import { ResponsesService } from './responses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

type AuthRequest = { user: { userId: string } };

@Controller('forms/:formId/responses')
export class ResponsesController {
  constructor(private readonly responsesService: ResponsesService) {}

  @Post()
  submit(
    @Param('formId') formId: string,
    @Body() body: { answers: Record<string, unknown>; linkToken?: string; email?: string; otpToken?: string },
    @Req() req: ExpressRequest,
  ) {
    return this.responsesService.submit(formId, body.answers, {
      linkToken: body.linkToken,
      email: body.email,
      otpToken: body.otpToken,
      ipAddress: req.ip,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Param('formId') formId: string, @Request() req: AuthRequest) {
    return this.responsesService.findByForm(formId, req.user.userId);
  }

  @Get('export/:format')
  @UseGuards(JwtAuthGuard)
  async export(
    @Param('formId') formId: string,
    @Param('format') format: string,
    @Request() req: AuthRequest,
    @Res() res: Response,
  ) {
    const result = await this.responsesService.exportResponses(formId, format, req.user.userId);
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.content);
  }
}
