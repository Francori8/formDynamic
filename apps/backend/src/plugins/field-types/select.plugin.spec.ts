import { selectPlugin, multiSelectPlugin } from './select.plugin';

describe('selectPlugin', () => {
  it('genera schema con las choices como enum', () => {
    const schema = selectPlugin.getSchema({
      id: 'f1', type: 'select', label: 'País', required: true, sectionId: 's1', validators: [],
      options: { choices: ['AR', 'CL', 'UY'] },
    });
    expect(schema.enum).toEqual(['AR', 'CL', 'UY']);
  });

  it('enum vacío si no hay choices', () => {
    const schema = selectPlugin.getSchema({ id: 'f1', type: 'select', label: 'País', required: true, sectionId: 's1', validators: [] });
    expect(schema.enum).toEqual([]);
  });
});

describe('multiSelectPlugin', () => {
  it('genera schema tipo array con items enum', () => {
    const schema = multiSelectPlugin.getSchema({
      id: 'f1', type: 'multi-select', label: 'Intereses', required: false, sectionId: 's1', validators: [],
      options: { choices: ['deporte', 'música'] },
    });
    expect(schema.type).toBe('array');
    expect((schema.items as { enum: string[] }).enum).toEqual(['deporte', 'música']);
    expect(schema.uniqueItems).toBe(true);
  });
});
