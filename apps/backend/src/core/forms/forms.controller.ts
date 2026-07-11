import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards, Request } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { JwtService } from '@nestjs/jwt';
import { FormsService } from './forms.service';
import type { CreateFormDto, UpdateFormPluginConfigDto, UpdateFormStatusDto, UpdateFormContentDto } from './forms.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt.strategy';

type AuthRequest = { user: { userId: string } };

@Controller('forms')
export class FormsController {
  constructor(
    private readonly formsService: FormsService,
    private readonly jwtService: JwtService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateFormDto, @Request() req: AuthRequest) {
    return this.formsService.create(dto, req.user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Request() req: AuthRequest) {
    return this.formsService.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: ExpressRequest) {
    const requesterId = this.tryGetRequesterId(req);
    return this.formsService.findOne(id, requesterId);
  }

  private tryGetRequesterId(req: ExpressRequest): string | undefined {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return undefined;
    try {
      const payload = this.jwtService.verify<JwtPayload>(authHeader.slice(7));
      return payload.sub;
    } catch {
      return undefined;
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  updateContent(@Param('id') id: string, @Body() dto: UpdateFormContentDto, @Request() req: AuthRequest) {
    return this.formsService.updateContent(id, dto, req.user.userId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateFormStatusDto, @Request() req: AuthRequest) {
    return this.formsService.updateStatus(id, dto, req.user.userId);
  }

  @Patch(':id/plugin-config')
  @UseGuards(JwtAuthGuard)
  updatePluginConfig(@Param('id') id: string, @Body() dto: UpdateFormPluginConfigDto, @Request() req: AuthRequest) {
    return this.formsService.updatePluginConfig(id, dto, req.user.userId);
  }
}
