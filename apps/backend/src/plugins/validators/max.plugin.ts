import type { ValidatorPlugin, ValidationResult } from '@formdynamic/plugin-contracts';

interface MaxConfig {
  value: number;
}

export const maxPlugin: ValidatorPlugin = {
  name: 'max',
  type: 'validator',

  validate(value: unknown, config: unknown): ValidationResult {
    const { value: max } = config as MaxConfig;

    if (typeof value !== 'number') {
      return { valid: false, error: 'El valor debe ser un número' };
    }

    return value <= max
      ? { valid: true }
      : { valid: false, error: `El valor máximo es ${max}` };
  },
};
