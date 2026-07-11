import { describe, expect, it } from 'vitest';
import { defaultSectionFlowPlugin } from './default-section-flow';

const SECTIONS = ['s1', 's2', 's3'];

describe('defaultSectionFlowPlugin', () => {
  it('salta a la sección de la primera condición que matchea', () => {
    const result = defaultSectionFlowPlugin.evaluate(
      {
        conditions: [
          { condition: { fieldId: 'age', operator: 'lt', value: 18 }, jumpToSectionId: 's3' },
          { condition: { fieldId: 'age', operator: 'gt', value: 0 }, jumpToSectionId: 's2' },
        ],
      },
      { age: 15 },
      SECTIONS,
      's1',
    );
    expect(result.nextSectionId).toBe('s3');
  });

  it('usa la primera condición que matchea en orden, ignora las siguientes', () => {
    const result = defaultSectionFlowPlugin.evaluate(
      {
        conditions: [
          { condition: { fieldId: 'age', operator: 'gt', value: 0 }, jumpToSectionId: 's2' },
          { condition: { fieldId: 'age', operator: 'lt', value: 18 }, jumpToSectionId: 's3' },
        ],
      },
      { age: 15 },
      SECTIONS,
      's1',
    );
    expect(result.nextSectionId).toBe('s2');
  });

  it('usa defaultJumpToSectionId si ninguna condición matchea', () => {
    const result = defaultSectionFlowPlugin.evaluate(
      {
        conditions: [{ condition: { fieldId: 'age', operator: 'lt', value: 0 }, jumpToSectionId: 's3' }],
        defaultJumpToSectionId: 's2',
      },
      { age: 15 },
      SECTIONS,
      's1',
    );
    expect(result.nextSectionId).toBe('s2');
  });

  it('sin condiciones ni defaultJump — sigue el orden natural', () => {
    const result = defaultSectionFlowPlugin.evaluate({ conditions: [] }, {}, SECTIONS, 's1');
    expect(result.nextSectionId).toBe('s2');
  });

  it('en la última sección sin defaultJump — devuelve null', () => {
    const result = defaultSectionFlowPlugin.evaluate({ conditions: [] }, {}, SECTIONS, 's3');
    expect(result.nextSectionId).toBeNull();
  });
});
