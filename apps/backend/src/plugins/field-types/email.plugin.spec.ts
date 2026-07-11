import { emailPlugin } from './email.plugin';

describe('emailPlugin', () => {
  it('valida emails correctos', () => {
    expect(emailPlugin.validate!('user@test.com').valid).toBe(true);
  });

  it('rechaza emails mal formados', () => {
    expect(emailPlugin.validate!('no-es-un-email').valid).toBe(false);
    expect(emailPlugin.validate!('falta@dominio').valid).toBe(false);
    expect(emailPlugin.validate!('@sin-usuario.com').valid).toBe(false);
  });

  it('permite vacío (required se valida por separado)', () => {
    expect(emailPlugin.validate!('').valid).toBe(true);
    expect(emailPlugin.validate!(null).valid).toBe(true);
    expect(emailPlugin.validate!(undefined).valid).toBe(true);
  });

  it('rechaza valores que no son string', () => {
    expect(emailPlugin.validate!(123).valid).toBe(false);
  });
});
