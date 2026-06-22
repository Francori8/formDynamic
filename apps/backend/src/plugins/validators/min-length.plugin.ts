import type { ValidatorPlugin, ValidationResult } from '@formdynamic/plugin-contracts';

interface MinLengthConfig {
  value: number;
}

export const minLengthPlugin: ValidatorPlugin = {
  name: 'min-length',
  type: 'validator',

  validate(value: unknown, config: unknown): ValidationResult {
    const { value: min } = config as MinLengthConfig;
    if (typeof value !== 'string') return { valid: false, error: 'El valor debe ser texto' };
    return value.length >= min
      ? { valid: true }
      : { valid: false, error: `Minimo ${min} caracteres` };
  },
};
