import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ResponsesService } from './responses.service';
import { PluginRegistryService } from '../plugin-registry/plugin-registry.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AccessControlPlugin, FieldTypePlugin, ResponseHookPlugin, ValidatorPlugin } from '@formdynamic/plugin-contracts';

function makePrismaMock() {
  return {
    form: { findUnique: jest.fn() },
    formLink: { findUnique: jest.fn(), update: jest.fn() },
    response: { create: jest.fn(), findMany: jest.fn() },
  };
}

const textField: FieldTypePlugin = {
  name: 'text',
  type: 'field-type',
  label: 'Texto',
  getSchema: () => ({}),
};

const requiredValidator: ValidatorPlugin = {
  name: 'required',
  type: 'validator',
  validate: (value) => (value ? { valid: true } : { valid: false, error: 'Requerido' }),
};

const allowAllAccess: AccessControlPlugin = {
  name: 'allow-all',
  type: 'access-control',
  checkAccess: async () => ({ allowed: true }),
};

function makeForm(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'form-1',
    title: 'Encuesta',
    status: 'PUBLISHED',
    ownerId: 'owner-1',
    pluginConfig: null,
    sections: [
      {
        id: 's1',
        fields: [
          { id: 'f1', type: 'text', label: 'Nombre', required: true, sectionId: 's1', validators: [{ name: 'required' }] },
        ],
      },
    ],
    ...overrides,
  };
}

describe('ResponsesService', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let registry: PluginRegistryService;
  let service: ResponsesService;

  beforeEach(() => {
    prisma = makePrismaMock();
    registry = new PluginRegistryService();
    registry.register(textField);
    registry.register(requiredValidator);
    registry.register(allowAllAccess);
    service = new ResponsesService(prisma as unknown as PrismaService, registry);
  });

  describe('submit', () => {
    it('lanza NotFoundException si el form no existe', async () => {
      prisma.form.findUnique.mockResolvedValue(null);
      await expect(service.submit('missing', {})).rejects.toThrow(NotFoundException);
    });

    it('rechaza si el form no está PUBLISHED', async () => {
      prisma.form.findUnique.mockResolvedValue(makeForm({ status: 'DRAFT' }));
      await expect(service.submit('form-1', { f1: 'x' })).rejects.toThrow('Este formulario aun no fue publicado');
    });

    it('rechaza si un campo requerido falta', async () => {
      prisma.form.findUnique.mockResolvedValue(makeForm());
      await expect(service.submit('form-1', {})).rejects.toThrow(BadRequestException);
    });

    it('crea la respuesta si las validaciones pasan', async () => {
      prisma.form.findUnique.mockResolvedValue(makeForm());
      prisma.response.create.mockResolvedValue({ id: 'r1', submittedAt: new Date() });
      const result = await service.submit('form-1', { f1: 'Juan' });
      expect(result.id).toBe('r1');
      expect(prisma.response.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ formId: 'form-1', answers: { f1: 'Juan' } }) }),
      );
    });

    it('rechaza si algún access-control plugin deniega', async () => {
      const denyAccess: AccessControlPlugin = {
        name: 'deny',
        type: 'access-control',
        checkAccess: async () => ({ allowed: false, reason: 'No autorizado' }),
      };
      registry.register(denyAccess);
      prisma.form.findUnique.mockResolvedValue(makeForm());
      await expect(service.submit('form-1', { f1: 'Juan' })).rejects.toThrow(ForbiddenException);
    });

    it('lanza si el link no existe o no pertenece al form', async () => {
      prisma.form.findUnique.mockResolvedValue(makeForm());
      prisma.formLink.findUnique.mockResolvedValue(null);
      await expect(
        service.submit('form-1', { f1: 'Juan' }, { linkToken: 'tok' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza si el link expiró', async () => {
      prisma.form.findUnique.mockResolvedValue(makeForm());
      prisma.formLink.findUnique.mockResolvedValue({
        id: 'link-1', formId: 'form-1', maxResponses: null, responseCount: 0,
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(
        service.submit('form-1', { f1: 'Juan' }, { linkToken: 'tok' }),
      ).rejects.toThrow('Este link ha expirado');
    });

    it('llama al response-hook habilitado y no falla el submit si el hook lanza', async () => {
      const onResponse = jest.fn().mockRejectedValue(new Error('hook roto'));
      const brokenHook: ResponseHookPlugin = { name: 'broken', type: 'response-hook', onResponse };
      registry.register(brokenHook);

      prisma.form.findUnique.mockResolvedValue(
        makeForm({ pluginConfig: { broken: { enabled: true } } }),
      );
      prisma.response.create.mockResolvedValue({ id: 'r1', submittedAt: new Date() });

      const result = await service.submit('form-1', { f1: 'Juan' });
      expect(result.id).toBe('r1');

      // fireHooks es fire-and-forget — esperamos el próximo tick para que corra
      await new Promise((resolve) => setImmediate(resolve));
      expect(onResponse).toHaveBeenCalled();
    });

    it('no llama a un response-hook deshabilitado', async () => {
      const onResponse = jest.fn().mockResolvedValue({ success: true });
      const hook: ResponseHookPlugin = { name: 'maybe', type: 'response-hook', onResponse };
      registry.register(hook);

      prisma.form.findUnique.mockResolvedValue(
        makeForm({ pluginConfig: { maybe: { enabled: false } } }),
      );
      prisma.response.create.mockResolvedValue({ id: 'r1', submittedAt: new Date() });

      await service.submit('form-1', { f1: 'Juan' });
      await new Promise((resolve) => setImmediate(resolve));
      expect(onResponse).not.toHaveBeenCalled();
    });
  });

  describe('findByForm', () => {
    it('lanza NotFoundException si el form no existe', async () => {
      prisma.form.findUnique.mockResolvedValue(null);
      await expect(service.findByForm('missing', 'owner-1')).rejects.toThrow(NotFoundException);
    });

    it('lanza ForbiddenException si el requester no es el dueño', async () => {
      prisma.form.findUnique.mockResolvedValue(makeForm());
      await expect(service.findByForm('form-1', 'someone-else')).rejects.toThrow(ForbiddenException);
    });

    it('devuelve las respuestas si el requester es el dueño', async () => {
      prisma.form.findUnique.mockResolvedValue(makeForm());
      prisma.response.findMany.mockResolvedValue([
        { id: 'r1', submittedAt: new Date(), answers: { f1: 'Juan' }, respondent: null },
      ]);
      const result = await service.findByForm('form-1', 'owner-1');
      expect(result.responses).toHaveLength(1);
      expect(result.form.id).toBe('form-1');
    });
  });

  describe('exportResponses', () => {
    it('lanza ForbiddenException si el requester no es el dueño', async () => {
      prisma.form.findUnique.mockResolvedValue(makeForm());
      await expect(service.exportResponses('form-1', 'csv', 'someone-else')).rejects.toThrow(ForbiddenException);
    });

    it('exporta si el requester es el dueño', async () => {
      const csvExporter = {
        name: 'csv',
        type: 'exporter' as const,
        export: jest.fn().mockResolvedValue({ filename: 'x.csv', mimeType: 'text/csv', content: 'a,b' }),
      };
      registry.register(csvExporter);
      prisma.form.findUnique.mockResolvedValue(makeForm());
      prisma.response.findMany.mockResolvedValue([]);

      const result = await service.exportResponses('form-1', 'csv', 'owner-1');
      expect(result.filename).toBe('x.csv');
    });
  });
});
