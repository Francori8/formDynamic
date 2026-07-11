import { textPlugin } from './text.plugin';

describe('textPlugin', () => {
  it('genera schema con minLength 1 si es required', () => {
    const schema = textPlugin.getSchema({ id: 'f1', type: 'text', label: 'Nombre', required: true, sectionId: 's1', validators: [] });
    expect(schema.minLength).toBe(1);
    expect(schema.title).toBe('Nombre');
  });

  it('genera schema con minLength 0 si no es required', () => {
    const schema = textPlugin.getSchema({ id: 'f1', type: 'text', label: 'Nombre', required: false, sectionId: 's1', validators: [] });
    expect(schema.minLength).toBe(0);
  });

  it('mezcla options en el schema', () => {
    const schema = textPlugin.getSchema({
      id: 'f1', type: 'text', label: 'Nombre', required: false, sectionId: 's1', validators: [],
      options: { placeholder: 'Escribe aquí' },
    });
    expect(schema.placeholder).toBe('Escribe aquí');
  });
});
