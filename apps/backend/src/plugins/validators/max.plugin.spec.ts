import { maxPlugin } from './max.plugin';

describe('maxPlugin', () => {
  it('acepta valores menores o iguales al máximo', () => {
    expect(maxPlugin.validate(5, { value: 5 }).valid).toBe(true);
    expect(maxPlugin.validate(3, { value: 5 }).valid).toBe(true);
  });

  it('rechaza valores mayores al máximo', () => {
    expect(maxPlugin.validate(10, { value: 5 }).valid).toBe(false);
  });

  it('rechaza valores que no son número', () => {
    expect(maxPlugin.validate('5', { value: 5 }).valid).toBe(false);
  });
});
