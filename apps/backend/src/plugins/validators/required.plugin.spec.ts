import { requiredPlugin } from './required.plugin';

describe('requiredPlugin', () => {
  it('rechaza vacíos', () => {
    expect(requiredPlugin.validate(null, {}).valid).toBe(false);
    expect(requiredPlugin.validate(undefined, {}).valid).toBe(false);
    expect(requiredPlugin.validate('', {}).valid).toBe(false);
    expect(requiredPlugin.validate([], {}).valid).toBe(false);
  });

  it('acepta valores presentes', () => {
    expect(requiredPlugin.validate('x', {}).valid).toBe(true);
    expect(requiredPlugin.validate(0, {}).valid).toBe(true);
    expect(requiredPlugin.validate(false, {}).valid).toBe(true);
    expect(requiredPlugin.validate(['a'], {}).valid).toBe(true);
  });
});
