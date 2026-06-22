import type { ValidatorPlugin, ValidationResult } from '@formdynamic/plugin-contracts';

interface MaxLengthConfig {
  value: number;
}

export const maxLengthPlugin: ValidatorPlugin = {
  name: 'max-length',
  type: 'validator',

  validate(value: unknown, config: unknown): ValidationResult {
    const { value: max } = config as MaxLengthConfig;
    if (typeof value !== 'string') return { valid: false, error: 'El valor debe ser texto' };
    return value.length <= max
      ? { valid: true }
      : { valid: false, error: `Maximo ${max} caracteres` };
  },
};
