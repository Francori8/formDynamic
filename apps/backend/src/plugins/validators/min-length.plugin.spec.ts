import { minLengthPlugin } from './min-length.plugin';

describe('minLengthPlugin', () => {
  it('acepta strings con longitud mayor o igual al mínimo', () => {
    expect(minLengthPlugin.validate('hola', { value: 4 }).valid).toBe(true);
    expect(minLengthPlugin.validate('holamundo', { value: 4 }).valid).toBe(true);
  });

  it('rechaza strings más cortos que el mínimo', () => {
    expect(minLengthPlugin.validate('hi', { value: 4 }).valid).toBe(false);
  });

  it('rechaza valores que no son string', () => {
    expect(minLengthPlugin.validate(123, { value: 4 }).valid).toBe(false);
  });
});
