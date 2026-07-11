import { describe, expect, it } from 'vitest';
import { defaultVisibilityPlugin } from './default-visibility';

describe('defaultVisibilityPlugin', () => {
  it('visible cuando la condición se cumple', () => {
    const result = defaultVisibilityPlugin.evaluate(
      { fieldId: 'country', operator: 'eq', value: 'AR' },
      { country: 'AR' },
    );
    expect(result.visible).toBe(true);
  });

  it('oculto cuando la condición no se cumple', () => {
    const result = defaultVisibilityPlugin.evaluate(
      { fieldId: 'country', operator: 'eq', value: 'AR' },
      { country: 'CL' },
    );
    expect(result.visible).toBe(false);
  });
});
