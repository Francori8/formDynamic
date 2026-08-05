import { BadRequestException, Body, Controller, NotFoundException, Param, Post } from '@nestjs/common';
import { OtpAuthPlugin } from './otp-auth.plugin';
import { PrismaService } from '../../core/prisma/prisma.service';

@Controller('l')
export class OtpAuthController {
  constructor(
    private readonly otpAuthPlugin: OtpAuthPlugin,
    private readonly prisma: PrismaService,
  ) {}

  // POST /l/:token/otp — solicitar código OTP para un link
  @Post(':token/otp')
  async requestOtp(
    @Body() body: { email: string },
  ) {
    // Nota: el token viene en la URL pero necesitamos el linkId
    // El frontend debe enviar el linkId o lo resolvemos aquí
    // Por simplicidad, el body incluye el linkId
    throw new BadRequestException('Usar POST /l/otp con linkId y email');
  }

  // POST /l/otp — solicitar código OTP dado linkId y email
  @Post('otp')
  async requestOtpByLinkId(@Body() body: { linkId: string; email: string }) {
    if (!body.linkId || !body.email) {
      throw new BadRequestException('linkId y email son requeridos');
    }

    const link = await this.prisma.formLink.findUnique({ where: { id: body.linkId } });
    if (!link) throw new NotFoundException('Link no encontrado');
    if (link.expiresAt && link.expiresAt < new Date()) throw new BadRequestException('Este link ha expirado');

    await this.otpAuthPlugin.requestOtp(body.email, { linkId: body.linkId });

    return { message: 'Código enviado al email indicado' };
  }
}

// Controlador público — solicitar OTP para un formulario sin link (verificación abierta)
@Controller('forms/:formId/otp')
export class FormOtpAuthController {
  constructor(
    private readonly otpAuthPlugin: OtpAuthPlugin,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  async requestOtp(@Body() body: { email: string }, @Param('formId') formId: string) {
    if (!body.email) throw new BadRequestException('email es requerido');

    const form = await this.prisma.form.findUnique({ where: { id: formId } });
    if (!form) throw new NotFoundException('Formulario no encontrado');
    if (form.status !== 'PUBLISHED') throw new BadRequestException('Este formulario no está disponible');

    const pluginConfig = form.pluginConfig as { 'otp-auth'?: { enabled?: boolean } } | null;
    if (!pluginConfig?.['otp-auth']?.enabled) {
      throw new BadRequestException('Este formulario no tiene verificación OTP activada');
    }

    await this.otpAuthPlugin.requestOtp(body.email, { formId });

    return { message: 'Código enviado al email indicado' };
  }
}
