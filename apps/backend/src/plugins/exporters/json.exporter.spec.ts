import { jsonExporter } from './json.exporter';
import type { ExportInput } from '@formdynamic/plugin-contracts';

const INPUT: ExportInput = {
  form: {
    id: 'form-1',
    title: 'Mi Encuesta',
    sections: [
      { id: 's1', fields: [{ id: 'f1', type: 'text', label: 'Nombre', required: true, sectionId: 's1', validators: [] }] },
    ],
  },
  responses: [
    { formId: 'form-1', responseId: 'r1', answers: { f1: 'Juan' }, submittedAt: new Date('2026-01-01T00:00:00Z') },
  ],
};

describe('jsonExporter', () => {
  it('mapea las respuestas usando el label del campo como key', async () => {
    const result = await jsonExporter.export(INPUT);
    const data = JSON.parse(result.content as string);
    expect(data[0]).toMatchObject({ responseId: 'r1', Nombre: 'Juan' });
  });

  it('valores ausentes se exportan como null', async () => {
    const input: ExportInput = {
      ...INPUT,
      responses: [{ formId: 'form-1', responseId: 'r1', answers: {}, submittedAt: new Date() }],
    };
    const result = await jsonExporter.export(input);
    const data = JSON.parse(result.content as string);
    expect(data[0].Nombre).toBeNull();
  });

  it('el filename sanitiza el título del form', async () => {
    const input: ExportInput = { ...INPUT, form: { ...INPUT.form, title: 'Mi Encuesta! (2026)' } };
    const result = await jsonExporter.export(input);
    expect(result.filename).toMatch(/^Mi_Encuesta___2026__respuestas\.json$/);
  });

  it('mimeType es application/json', async () => {
    const result = await jsonExporter.export(INPUT);
    expect(result.mimeType).toBe('application/json');
  });
});
