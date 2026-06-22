import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

export interface CreateFormLinkDto {
  label?: string;
  maxResponses?: number | null;
  expiresAt?: Date | null;
}

@Injectable()
export class FormLinksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(formId: string, ownerId: string, dto: CreateFormLinkDto) {
    const form = await this.prisma.form.findUnique({ where: { id: formId } });
    if (!form) throw new NotFoundException(`Form ${formId} not found`);
    if (form.ownerId !== ownerId) throw new BadRequestException('No tenes permiso para modificar este formulario');

    const token = randomBytes(16).toString('hex');

    return this.prisma.formLink.create({
      data: {
        formId,
        token,
        label: dto.label ?? null,
        maxResponses: dto.maxResponses ?? null,
        expiresAt: dto.expiresAt ?? null,
      },
    });
  }

  async findByForm(formId: string, ownerId: string) {
    const form = await this.prisma.form.findUnique({ where: { id: formId } });
    if (!form) throw new NotFoundException(`Form ${formId} not found`);
    if (form.ownerId !== ownerId) throw new BadRequestException('No tenes permiso para ver este formulario');

    return this.prisma.formLink.findMany({
      where: { formId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(linkId: string, ownerId: string) {
    const link = await this.prisma.formLink.findUnique({
      where: { id: linkId },
      include: { form: true },
    });
    if (!link) throw new NotFoundException(`Link ${linkId} not found`);
    if (link.form.ownerId !== ownerId) throw new BadRequestException('No tenes permiso para modificar este link');

    return this.prisma.formLink.delete({ where: { id: linkId } });
  }

  async getAllowedEmails(linkId: string, ownerId: string) {
    const link = await this.prisma.formLink.findUnique({
      where: { id: linkId },
      include: { form: true },
    });
    if (!link) throw new NotFoundException(`Link ${linkId} not found`);
    if (link.form.ownerId !== ownerId) throw new BadRequestException('No tenes permiso para ver este link');

    return this.prisma.formLinkEmail.findMany({ where: { linkId } });
  }

  async setAllowedEmails(linkId: string, ownerId: string, emails: string[]) {
    const link = await this.prisma.formLink.findUnique({
      where: { id: linkId },
      include: { form: true },
    });
    if (!link) throw new NotFoundException(`Link ${linkId} not found`);
    if (link.form.ownerId !== ownerId) throw new BadRequestException('No tenes permiso para modificar este link');

    // Reemplaza todos los emails del link
    await this.prisma.formLinkEmail.deleteMany({ where: { linkId } });
    if (emails.length > 0) {
      await this.prisma.formLinkEmail.createMany({
        data: emails.map((email) => ({ linkId, email: email.toLowerCase().trim() })),
        skipDuplicates: true,
      });
    }

    return this.prisma.formLinkEmail.findMany({ where: { linkId } });
  }

  async resolveByToken(token: string) {
    const link = await this.prisma.formLink.findUnique({
      where: { token },
      include: { form: true },
    });
    if (!link) throw new NotFoundException('Link no encontrado');
    if (link.form.status !== 'PUBLISHED') throw new BadRequestException('Este formulario no está disponible');
    if (link.expiresAt && link.expiresAt < new Date()) throw new BadRequestException('Este link ha expirado');

    return link;
  }
}
