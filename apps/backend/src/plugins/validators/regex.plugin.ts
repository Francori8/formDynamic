import type { ValidatorPlugin, ValidationResult } from '@formdynamic/plugin-contracts';

interface RegexConfig {
  pattern: string;
  message?: string;
}

export const regexPlugin: ValidatorPlugin = {
  name: 'regex',
  type: 'validator',

  validate(value: unknown, config: unknown): ValidationResult {
    const { pattern, message } = config as RegexConfig;

    if (typeof value !== 'string') {
      return { valid: false, error: 'El valor debe ser texto' };
    }

    return new RegExp(pattern).test(value)
      ? { valid: true }
      : { valid: false, error: message ?? 'El valor no tiene el formato correcto' };
  },
};
