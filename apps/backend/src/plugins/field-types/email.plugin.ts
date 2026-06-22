import type { FieldTypePlugin, FieldConfig, ValidationResult } from '@formdynamic/plugin-contracts';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const emailPlugin: FieldTypePlugin = {
  name: 'email',
  label: 'Email',
  type: 'field-type',

  getSchema(config: FieldConfig): Record<string, unknown> {
    return {
      type: 'string',
      format: 'email',
      title: config.label,
    };
  },

  validate(value: unknown): ValidationResult {
    if (value === null || value === undefined || value === '') {
      return { valid: true }; // required se maneja por separado
    }
    if (typeof value !== 'string' || !EMAIL_REGEX.test(value)) {
      return { valid: false, error: 'Ingresa un email valido' };
    }
    return { valid: true };
  },
};
