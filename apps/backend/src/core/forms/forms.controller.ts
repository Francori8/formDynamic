import { Body, Controller, Get, Param, Patch, Post, UseGuards, Request } from '@nestjs/common';
import { FormsService } from './forms.service';
import type { CreateFormDto, UpdateFormPluginConfigDto, UpdateFormStatusDto, UpdateFormContentDto } from './forms.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

type AuthRequest = { user: { userId: string } };

@Controller('forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

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
  findOne(@Param('id') id: string) {
    return this.formsService.findOne(id);
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
