import { csvExporter } from './csv.exporter';
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

describe('csvExporter', () => {
  it('genera headers con ID, fecha y labels de campos', async () => {
    const result = await csvExporter.export(INPUT);
    const [headerLine] = (result.content as string).split('\n');
    expect(headerLine).toBe('ID respuesta,Fecha,Nombre');
  });

  it('incluye una fila por respuesta', async () => {
    const result = await csvExporter.export(INPUT);
    const lines = (result.content as string).split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('r1');
    expect(lines[1]).toContain('Juan');
  });

  it('escapa valores con comas entre comillas', async () => {
    const input: ExportInput = {
      ...INPUT,
      responses: [{ formId: 'form-1', responseId: 'r1', answers: { f1: 'Juan, Pérez' }, submittedAt: new Date() }],
    };
    const result = await csvExporter.export(input);
    expect(result.content).toContain('"Juan, Pérez"');
  });

  it('escapa comillas dobles duplicándolas', async () => {
    const input: ExportInput = {
      ...INPUT,
      responses: [{ formId: 'form-1', responseId: 'r1', answers: { f1: 'Dijo "hola"' }, submittedAt: new Date() }],
    };
    const result = await csvExporter.export(input);
    expect(result.content).toContain('"Dijo ""hola"""');
  });

  it('valores ausentes se exportan como celda vacía', async () => {
    const input: ExportInput = {
      ...INPUT,
      responses: [{ formId: 'form-1', responseId: 'r1', answers: {}, submittedAt: new Date() }],
    };
    const result = await csvExporter.export(input);
    const lines = (result.content as string).split('\n');
    expect(lines[1].endsWith(',')).toBe(true);
  });

  it('el filename sanitiza el título del form', async () => {
    const input: ExportInput = { ...INPUT, form: { ...INPUT.form, title: 'Mi Encuesta! (2026)' } };
    const result = await csvExporter.export(input);
    expect(result.filename).toMatch(/^Mi_Encuesta___2026__respuestas\.csv$/);
  });
});
