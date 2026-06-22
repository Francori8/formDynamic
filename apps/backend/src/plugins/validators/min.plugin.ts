import type { ValidatorPlugin, ValidationResult } from '@formdynamic/plugin-contracts';

interface MinConfig {
  value: number;
}

export const minPlugin: ValidatorPlugin = {
  name: 'min',
  type: 'validator',

  validate(value: unknown, config: unknown): ValidationResult {
    const { value: min } = config as MinConfig;

    if (typeof value !== 'number') {
      return { valid: false, error: 'El valor debe ser un número' };
    }

    return value >= min
      ? { valid: true }
      : { valid: false, error: `El valor mínimo es ${min}` };
  },
};
