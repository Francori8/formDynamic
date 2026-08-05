import { renderEmail } from './email-template';

describe('renderEmail', () => {
  it('incluye el título y el body en el HTML resultante', () => {
    const html = renderEmail('Mi título', '<p>contenido</p>');
    expect(html).toContain('Mi título');
    expect(html).toContain('<p>contenido</p>');
  });

  it('incluye el nombre de la marca', () => {
    const html = renderEmail('X', '<p>x</p>');
    expect(html).toContain('FormDynamic');
  });

  it('no escapa el body — se inserta tal cual como HTML', () => {
    const html = renderEmail('X', '<strong>negrita</strong>');
    expect(html).toContain('<strong>negrita</strong>');
  });
});
