import type { FieldTypePlugin, FieldConfig } from '@formdynamic/plugin-contracts';

export const numberPlugin: FieldTypePlugin = {
  name: 'number',
  label: 'Número',
  type: 'field-type',

  getSchema(config: FieldConfig): Record<string, unknown> {
    return {
      type: 'number',
      title: config.label,
      ...config.options,
    };
  },
};
