import { numberPlugin } from './number.plugin';

describe('numberPlugin', () => {
  it('genera schema tipo number', () => {
    const schema = numberPlugin.getSchema({ id: 'f1', type: 'number', label: 'Edad', required: true, sectionId: 's1', validators: [] });
    expect(schema.type).toBe('number');
    expect(schema.title).toBe('Edad');
  });

  it('mezcla options en el schema', () => {
    const schema = numberPlugin.getSchema({
      id: 'f1', type: 'number', label: 'Edad', required: false, sectionId: 's1', validators: [],
      options: { step: 1 },
    });
    expect(schema.step).toBe(1);
  });
});
