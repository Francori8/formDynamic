import { BadRequestException, Body, Controller, NotFoundException, Post } from '@nestjs/common';
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

    await this.otpAuthPlugin.requestOtp(body.email, body.linkId);

    return { message: 'Código enviado al email indicado' };
  }
}
