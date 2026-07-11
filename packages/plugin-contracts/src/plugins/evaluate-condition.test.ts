import { describe, expect, it } from 'vitest';
import { evaluateCondition } from './evaluate-condition';

describe('evaluateCondition', () => {
  it('eq — compara como string', () => {
    expect(evaluateCondition({ fieldId: 'a', operator: 'eq', value: '5' }, { a: 5 })).toBe(true);
    expect(evaluateCondition({ fieldId: 'a', operator: 'eq', value: '5' }, { a: 6 })).toBe(false);
  });

  it('neq', () => {
    expect(evaluateCondition({ fieldId: 'a', operator: 'neq', value: '5' }, { a: 6 })).toBe(true);
    expect(evaluateCondition({ fieldId: 'a', operator: 'neq', value: '5' }, { a: 5 })).toBe(false);
  });

  it('gt / lt — comparan como número', () => {
    expect(evaluateCondition({ fieldId: 'a', operator: 'gt', value: 3 }, { a: 5 })).toBe(true);
    expect(evaluateCondition({ fieldId: 'a', operator: 'gt', value: 5 }, { a: 5 })).toBe(false);
    expect(evaluateCondition({ fieldId: 'a', operator: 'lt', value: 10 }, { a: 5 })).toBe(true);
    expect(evaluateCondition({ fieldId: 'a', operator: 'lt', value: 5 }, { a: 5 })).toBe(false);
  });

  it('contains — case-insensitive', () => {
    expect(evaluateCondition({ fieldId: 'a', operator: 'contains', value: 'OL' }, { a: 'Hola' })).toBe(true);
    expect(evaluateCondition({ fieldId: 'a', operator: 'contains', value: 'xyz' }, { a: 'Hola' })).toBe(false);
  });

  it('is-empty', () => {
    expect(evaluateCondition({ fieldId: 'a', operator: 'is-empty' }, { a: undefined })).toBe(true);
    expect(evaluateCondition({ fieldId: 'a', operator: 'is-empty' }, { a: null })).toBe(true);
    expect(evaluateCondition({ fieldId: 'a', operator: 'is-empty' }, { a: '' })).toBe(true);
    expect(evaluateCondition({ fieldId: 'a', operator: 'is-empty' }, { a: 0 })).toBe(false);
    expect(evaluateCondition({ fieldId: 'a', operator: 'is-empty' }, { a: 'x' })).toBe(false);
  });

  it('is-not-empty', () => {
    expect(evaluateCondition({ fieldId: 'a', operator: 'is-not-empty' }, { a: 'x' })).toBe(true);
    expect(evaluateCondition({ fieldId: 'a', operator: 'is-not-empty' }, { a: '' })).toBe(false);
  });

  it('campo inexistente en answers se trata como undefined', () => {
    expect(evaluateCondition({ fieldId: 'missing', operator: 'is-empty' }, {})).toBe(true);
    expect(evaluateCondition({ fieldId: 'missing', operator: 'eq', value: 'x' }, {})).toBe(false);
  });
});
