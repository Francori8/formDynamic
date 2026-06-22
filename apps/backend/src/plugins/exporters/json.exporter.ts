import type { ExporterPlugin, ExportInput, ExportResult } from '@formdynamic/plugin-contracts';

export const jsonExporter: ExporterPlugin = {
  name: 'json',
  type: 'exporter',

  async export({ form, responses }: ExportInput): Promise<ExportResult> {
    const allFields = form.sections.flatMap((s) => s.fields);

    const data = responses.map((r) => {
      const row: Record<string, unknown> = {
        responseId: r.responseId,
        submittedAt: r.submittedAt,
      };
      for (const field of allFields) {
        row[field.label] = r.answers[field.id] ?? null;
      }
      return row;
    });

    return {
      filename: `${form.title.replace(/[^a-z0-9]/gi, '_')}_respuestas.json`,
      mimeType: 'application/json',
      content: JSON.stringify(data, null, 2),
    };
  },
};
