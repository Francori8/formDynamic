import type { FieldTypePlugin, FieldConfig } from '@formdynamic/plugin-contracts';

export const textPlugin: FieldTypePlugin = {
  name: 'text',
  label: 'Texto',
  type: 'field-type',

  getSchema(config: FieldConfig): Record<string, unknown> {
    return {
      type: 'string',
      title: config.label,
      minLength: config.required ? 1 : 0,
      ...config.options,
    };
  },
};
