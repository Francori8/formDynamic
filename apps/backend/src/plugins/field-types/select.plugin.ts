import type { FieldTypePlugin, FieldConfig } from '@formdynamic/plugin-contracts';

export const selectPlugin: FieldTypePlugin = {
  name: 'select',
  label: 'Selección única',
  type: 'field-type',

  getSchema(config: FieldConfig): Record<string, unknown> {
    const options = config.options as { choices?: string[] } | undefined;
    return {
      type: 'string',
      title: config.label,
      enum: options?.choices ?? [],
    };
  },
};

export const multiSelectPlugin: FieldTypePlugin = {
  name: 'multi-select',
  label: 'Selección múltiple',
  type: 'field-type',

  getSchema(config: FieldConfig): Record<string, unknown> {
    const options = config.options as { choices?: string[] } | undefined;
    return {
      type: 'array',
      title: config.label,
      items: { type: 'string', enum: options?.choices ?? [] },
      uniqueItems: true,
    };
  },
};
