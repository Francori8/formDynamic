import { regexPlugin } from './regex.plugin';

describe('regexPlugin', () => {
  it('acepta valores que matchean el pattern', () => {
    expect(regexPlugin.validate('12345', { pattern: '^\\d+$' }).valid).toBe(true);
  });

  it('rechaza valores que no matchean el pattern', () => {
    expect(regexPlugin.validate('abc123', { pattern: '^\\d+$' }).valid).toBe(false);
  });

  it('usa el mensaje custom si se provee', () => {
    const result = regexPlugin.validate('abc', { pattern: '^\\d+$', message: 'Solo números' });
    expect(result.error).toBe('Solo números');
  });

  it('rechaza valores que no son string', () => {
    expect(regexPlugin.validate(123, { pattern: '^\\d+$' }).valid).toBe(false);
  });
});
