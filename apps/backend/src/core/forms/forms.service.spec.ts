import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FormsService } from './forms.service';
import { PluginRegistryService } from '../plugin-registry/plugin-registry.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { FieldTypePlugin } from '@formdynamic/plugin-contracts';

function makePrismaMock() {
  return {
    form: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };
}

const textField: FieldTypePlugin = {
  name: 'text',
  type: 'field-type',
  label: 'Texto',
  getSchema: () => ({}),
};

const BASE_FORM = {
  id: 'form-1',
  title: 'Encuesta',
  sections: [] as unknown[],
  status: 'PUBLISHED',
  ownerId: 'owner-1',
  pluginConfig: { webhook: { enabled: true, url: 'https://example.com/hook' } },
};

describe('FormsService', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let registry: PluginRegistryService;
  let service: FormsService;

  beforeEach(() => {
    prisma = makePrismaMock();
    registry = new PluginRegistryService();
    registry.register(textField);
    service = new FormsService(prisma as unknown as PrismaService, registry);
  });

  describe('create', () => {
    it('crea el form con el owner y sections dados', async () => {
      prisma.form.create.mockResolvedValue({ id: 'form-1', title: 'Nueva', sections: [] });

      const dto = { title: 'Nueva', sections: [] };
      const result = await service.create(dto, 'owner-1');

      expect(result.id).toBe('form-1');
      expect(prisma.form.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ title: 'Nueva', ownerId: 'owner-1' }),
      });
    });

    it('crea el form sin owner si no se provee (formulario anónimo)', async () => {
      prisma.form.create.mockResolvedValue({ id: 'form-1', title: 'Nueva', sections: [] });
      await service.create({ title: 'Nueva', sections: [] });
      const callData = prisma.form.create.mock.calls[0][0].data;
      expect(callData).not.toHaveProperty('ownerId');
    });

    it('lanza si alguna sección usa un field-type no registrado', async () => {
      const dto = {
        title: 'Nueva',
        sections: [{ id: 's1', fields: [{ id: 'f1', type: 'does-not-exist', label: 'X', required: false, sectionId: 's1', validators: [] }] }],
      };
      await expect(service.create(dto, 'owner-1')).rejects.toThrow('Plugin not found');
      expect(prisma.form.create).not.toHaveBeenCalled();
    });

    it('acepta sections con field-types válidos', async () => {
      prisma.form.create.mockResolvedValue({ id: 'form-1', title: 'Nueva', sections: [] });
      const dto = {
        title: 'Nueva',
        sections: [{ id: 's1', fields: [{ id: 'f1', type: 'text', label: 'Nombre', required: true, sectionId: 's1', validators: [] }] }],
      };
      await expect(service.create(dto, 'owner-1')).resolves.toBeDefined();
    });
  });

  describe('findOne', () => {
    it('lanza NotFoundException si el form no existe', async () => {
      prisma.form.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });

    it('oculta ownerId y pluginConfig si el requester no es el dueño', async () => {
      prisma.form.findUnique.mockResolvedValue(BASE_FORM);
      const result = await service.findOne('form-1', 'someone-else');
      expect(result).not.toHaveProperty('ownerId');
      expect(result).not.toHaveProperty('pluginConfig');
      expect(result.title).toBe('Encuesta');
    });

    it('oculta ownerId y pluginConfig si no hay requester (visitante anónimo)', async () => {
      prisma.form.findUnique.mockResolvedValue(BASE_FORM);
      const result = await service.findOne('form-1');
      expect(result).not.toHaveProperty('ownerId');
      expect(result).not.toHaveProperty('pluginConfig');
    });

    it('incluye ownerId y pluginConfig si el requester es el dueño', async () => {
      prisma.form.findUnique.mockResolvedValue(BASE_FORM);
      const result = await service.findOne('form-1', 'owner-1');
      expect(result).toHaveProperty('ownerId', 'owner-1');
      expect(result).toHaveProperty('pluginConfig');
    });

    it('calcula requiresOtp incluso para el owner (UX: el owner también debe ver el paso de verificación)', async () => {
      const formWithOtp = { ...BASE_FORM, pluginConfig: { 'otp-auth': { enabled: true } } };
      prisma.form.findUnique.mockResolvedValue(formWithOtp);

      const asOwner = await service.findOne('form-1', 'owner-1');
      expect(asOwner.requiresOtp).toBe(true);

      const asStranger = await service.findOne('form-1', 'someone-else');
      expect(asStranger.requiresOtp).toBe(true);

      const asAnonymous = await service.findOne('form-1');
      expect(asAnonymous.requiresOtp).toBe(true);
    });

    it('requiresOtp es false si otp-auth no está activado', async () => {
      prisma.form.findUnique.mockResolvedValue(BASE_FORM);
      const result = await service.findOne('form-1', 'owner-1');
      expect(result.requiresOtp).toBe(false);
    });
  });

  describe('updateContent', () => {
    it('lanza si el requester no es el dueño', async () => {
      prisma.form.findUnique.mockResolvedValue({ ...BASE_FORM, status: 'DRAFT' });
      await expect(
        service.updateContent('form-1', { title: 'x' }, 'someone-else'),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza si el form no está en DRAFT', async () => {
      prisma.form.findUnique.mockResolvedValue({ ...BASE_FORM, status: 'PUBLISHED' });
      await expect(
        service.updateContent('form-1', { title: 'x' }, 'owner-1'),
      ).rejects.toThrow('Solo se puede editar un formulario en borrador');
    });

    it('permite editar si es el dueño y está en DRAFT', async () => {
      prisma.form.findUnique.mockResolvedValue({ ...BASE_FORM, status: 'DRAFT' });
      prisma.form.update.mockResolvedValue({ id: 'form-1', title: 'Nuevo título', sections: [] });
      const result = await service.updateContent('form-1', { title: 'Nuevo título' }, 'owner-1');
      expect(result.title).toBe('Nuevo título');
    });
  });

  describe('updateStatus', () => {
    it.each([
      ['DRAFT', 'PUBLISHED', true],
      ['DRAFT', 'CLOSED', false],
      ['PUBLISHED', 'CLOSED', true],
      ['PUBLISHED', 'DRAFT', false],
      ['CLOSED', 'PUBLISHED', false],
    ])('transición %s -> %s permitida=%s', async (from, to, allowed) => {
      prisma.form.findUnique.mockResolvedValue({ ...BASE_FORM, status: from });
      prisma.form.update.mockResolvedValue({ id: 'form-1', status: to });

      const call = service.updateStatus('form-1', { status: to as never }, 'owner-1');
      if (allowed) {
        await expect(call).resolves.toEqual({ id: 'form-1', status: to });
      } else {
        await expect(call).rejects.toThrow(BadRequestException);
      }
    });

    it('lanza si el requester no es el dueño', async () => {
      prisma.form.findUnique.mockResolvedValue({ ...BASE_FORM, status: 'DRAFT' });
      await expect(
        service.updateStatus('form-1', { status: 'PUBLISHED' as never }, 'someone-else'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updatePluginConfig', () => {
    it('lanza si el requester no es el dueño', async () => {
      prisma.form.findUnique.mockResolvedValue({ ...BASE_FORM, status: 'DRAFT' });
      await expect(
        service.updatePluginConfig('form-1', { pluginConfig: { webhook: { enabled: true } } }, 'someone-else'),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza si el form no está en DRAFT', async () => {
      prisma.form.findUnique.mockResolvedValue({ ...BASE_FORM, status: 'PUBLISHED' });
      await expect(
        service.updatePluginConfig('form-1', { pluginConfig: { webhook: { enabled: true } } }, 'owner-1'),
      ).rejects.toThrow('Solo se puede modificar un formulario en borrador');
    });

    it('activa un plugin si el requester es el dueño y el form está en DRAFT', async () => {
      prisma.form.findUnique.mockResolvedValue({ ...BASE_FORM, status: 'DRAFT' });
      prisma.form.update.mockResolvedValue({
        id: 'form-1',
        pluginConfig: { 'owner-notify': { enabled: true } },
      });

      const result = await service.updatePluginConfig(
        'form-1',
        { pluginConfig: { 'owner-notify': { enabled: true } } },
        'owner-1',
      );

      expect(result.pluginConfig).toEqual({ 'owner-notify': { enabled: true } });
      expect(prisma.form.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'form-1' },
          data: { pluginConfig: { 'owner-notify': { enabled: true } } },
        }),
      );
    });
  });

  describe('findAll', () => {
    it('filtra por ownerId cuando se provee', async () => {
      prisma.form.findMany.mockResolvedValue([]);
      await service.findAll('owner-1');
      expect(prisma.form.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { ownerId: 'owner-1' } }),
      );
    });

    it('sin ownerId trae todos los forms', async () => {
      prisma.form.findMany.mockResolvedValue([]);
      await service.findAll();
      expect(prisma.form.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });
  });
});
