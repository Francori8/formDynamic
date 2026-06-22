import type { FieldTypePlugin, FieldConfig, ValidationResult } from '@formdynamic/plugin-contracts';

// Acepta formato internacional: +54 11 1234-5678, +1 (555) 123-4567, etc.
// Permite espacios, guiones, paréntesis. Mínimo 7 dígitos, máximo 15 (E.164).
const PHONE_REGEX = /^\+?[\d\s\-().]{7,20}$/;

export const phonePlugin: FieldTypePlugin = {
  name: 'phone',
  label: 'Telefono',
  type: 'field-type',

  getSchema(config: FieldConfig): Record<string, unknown> {
    return {
      type: 'string',
      format: 'phone',
      title: config.label,
    };
  },

  validate(value: unknown): ValidationResult {
    if (value === null || value === undefined || value === '') {
      return { valid: true };
    }
    if (typeof value !== 'string' || !PHONE_REGEX.test(value)) {
      return { valid: false, error: 'Ingresa un numero de telefono valido' };
    }
    return { valid: true };
  },
};
