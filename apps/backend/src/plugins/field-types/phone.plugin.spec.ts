import { phonePlugin } from './phone.plugin';

describe('phonePlugin', () => {
  it('valida formatos de teléfono aceptables', () => {
    expect(phonePlugin.validate!('+54 11 1234-5678').valid).toBe(true);
    expect(phonePlugin.validate!('+1 (555) 123-4567').valid).toBe(true);
    expect(phonePlugin.validate!('1234567').valid).toBe(true);
  });

  it('rechaza teléfonos demasiado cortos', () => {
    expect(phonePlugin.validate!('123').valid).toBe(false);
  });

  it('rechaza texto no numérico', () => {
    expect(phonePlugin.validate!('no-es-un-telefono').valid).toBe(false);
  });

  it('permite vacío (required se valida por separado)', () => {
    expect(phonePlugin.validate!('').valid).toBe(true);
    expect(phonePlugin.validate!(null).valid).toBe(true);
  });
});
