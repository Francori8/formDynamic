import type { ExporterPlugin, ExportInput, ExportResult } from '@formdynamic/plugin-contracts';

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = Array.isArray(value) ? value.join('; ') : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const csvExporter: ExporterPlugin = {
  name: 'csv',
  type: 'exporter',

  async export({ form, responses }: ExportInput): Promise<ExportResult> {
    const allFields = form.sections.flatMap((s) => s.fields);

    const headers = ['ID respuesta', 'Fecha', ...allFields.map((f) => f.label)];
    const rows = responses.map((r) => [
      r.responseId,
      new Date(r.submittedAt).toISOString(),
      ...allFields.map((f) => escapeCsv(r.answers[f.id])),
    ]);

    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');

    return {
      filename: `${form.title.replace(/[^a-z0-9]/gi, '_')}_respuestas.csv`,
      mimeType: 'text/csv',
      content: csv,
    };
  },
};
