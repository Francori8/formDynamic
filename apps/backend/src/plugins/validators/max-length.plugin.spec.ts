import { maxLengthPlugin } from './max-length.plugin';

describe('maxLengthPlugin', () => {
  it('acepta strings con longitud menor o igual al máximo', () => {
    expect(maxLengthPlugin.validate('hola', { value: 4 }).valid).toBe(true);
    expect(maxLengthPlugin.validate('hi', { value: 4 }).valid).toBe(true);
  });

  it('rechaza strings más largos que el máximo', () => {
    expect(maxLengthPlugin.validate('holamundo', { value: 4 }).valid).toBe(false);
  });

  it('rechaza valores que no son string', () => {
    expect(maxLengthPlugin.validate(123, { value: 4 }).valid).toBe(false);
  });
});
