import { minPlugin } from './min.plugin';

describe('minPlugin', () => {
  it('acepta valores mayores o iguales al mínimo', () => {
    expect(minPlugin.validate(5, { value: 5 }).valid).toBe(true);
    expect(minPlugin.validate(10, { value: 5 }).valid).toBe(true);
  });

  it('rechaza valores menores al mínimo', () => {
    expect(minPlugin.validate(3, { value: 5 }).valid).toBe(false);
  });

  it('rechaza valores que no son número', () => {
    expect(minPlugin.validate('5', { value: 5 }).valid).toBe(false);
  });
});
