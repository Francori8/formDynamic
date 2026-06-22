import type { ValidatorPlugin, ValidationResult } from '@formdynamic/plugin-contracts';

export const requiredPlugin: ValidatorPlugin = {
  name: 'required',
  type: 'validator',

  validate(value: unknown): ValidationResult {
    const isEmpty =
      value === null ||
      value === undefined ||
      value === '' ||
      (Array.isArray(value) && value.length === 0);

    return isEmpty
      ? { valid: false, error: 'Este campo es obligatorio' }
      : { valid: true };
  },
};
