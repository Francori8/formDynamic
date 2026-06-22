import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ResponsesService } from './responses.service';

@Controller('forms/:formId/responses')
export class ResponsesController {
  constructor(private readonly responsesService: ResponsesService) {}

  @Post()
  submit(
    @Param('formId') formId: string,
    @Body() body: { answers: Record<string, unknown>; linkToken?: string; email?: string; otpToken?: string },
    @Req() req: Request,
  ) {
    return this.responsesService.submit(formId, body.answers, {
      linkToken: body.linkToken,
      email: body.email,
      otpToken: body.otpToken,
      ipAddress: req.ip,
    });
  }

  @Get()
  findAll(@Param('formId') formId: string) {
    return this.responsesService.findByForm(formId);
  }

  @Get('export/:format')
  async export(
    @Param('formId') formId: string,
    @Param('format') format: string,
    @Res() res: Response,
  ) {
    const result = await this.responsesService.exportResponses(formId, format);
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.content);
  }
}
