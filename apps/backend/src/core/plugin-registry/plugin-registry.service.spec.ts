import { PluginRegistryService } from './plugin-registry.service';
import type { FieldTypePlugin, ResponseHookPlugin, SectionFlowPlugin, Section } from '@formdynamic/plugin-contracts';

function fieldType(name: string): FieldTypePlugin {
  return { name, type: 'field-type', label: name, getSchema: () => ({}) };
}

function responseHook(name: string): ResponseHookPlugin {
  return { name, type: 'response-hook', onResponse: async () => ({ success: true }) };
}

describe('PluginRegistryService', () => {
  let registry: PluginRegistryService;

  beforeEach(() => {
    registry = new PluginRegistryService();
  });

  it('registra y devuelve un plugin por nombre', () => {
    registry.register(fieldType('text'));
    expect(registry.getFieldType('text').name).toBe('text');
  });

  it('lanza si se pide un plugin no registrado', () => {
    expect(() => registry.getFieldType('does-not-exist')).toThrow('Plugin not found');
  });

  it('sobreescribe si se registra el mismo nombre dos veces', () => {
    registry.register(fieldType('text'));
    const second = fieldType('text');
    registry.register(second);
    expect(registry.getFieldType('text')).toBe(second);
  });

  it('listByType devuelve los nombres registrados de ese tipo', () => {
    registry.register(fieldType('text'));
    registry.register(fieldType('number'));
    expect(registry.listByType('field-type').sort()).toEqual(['number', 'text']);
  });

  it('getResponseHookPlugins devuelve todos los response-hook registrados', () => {
    registry.register(responseHook('webhook'));
    registry.register(responseHook('owner-notify'));
    const names = registry.getResponseHookPlugins().map((p) => p.name).sort();
    expect(names).toEqual(['owner-notify', 'webhook']);
  });

  it('getResponseHookPlugins devuelve vacío si no hay ninguno registrado', () => {
    expect(registry.getResponseHookPlugins()).toEqual([]);
  });

  describe('getVisitedSectionIds', () => {
    const sections: Section[] = [
      { id: 's1', fields: [] },
      { id: 's2', fields: [] },
      { id: 's3', fields: [] },
    ];

    it('sin section-flow plugin registrado — recorre todo en orden natural', () => {
      const visited = registry.getVisitedSectionIds(sections, {});
      expect(visited).toEqual(new Set(['s1', 's2', 's3']));
    });

    it('con section-flow plugin — salta secciones según la condición', () => {
      const skipToEnd: SectionFlowPlugin = {
        name: 'skip-to-end',
        type: 'section-flow',
        evaluate: (_flow, _answers, allIds, currentId) =>
          currentId === 's1' ? { nextSectionId: 's3' } : { nextSectionId: null },
      };
      registry.register(skipToEnd);

      const sectionsWithFlow: Section[] = [
        { id: 's1', fields: [], flow: { conditions: [] } },
        { id: 's2', fields: [] },
        { id: 's3', fields: [], flow: { conditions: [] } },
      ];

      const visited = registry.getVisitedSectionIds(sectionsWithFlow, {});
      expect(visited).toEqual(new Set(['s1', 's3']));
    });

    it('no entra en loop infinito si el flujo vuelve sobre sí mismo', () => {
      const loopPlugin: SectionFlowPlugin = {
        name: 'loop',
        type: 'section-flow',
        evaluate: () => ({ nextSectionId: 's1' }),
      };
      registry.register(loopPlugin);

      const sectionsWithFlow: Section[] = [{ id: 's1', fields: [], flow: { conditions: [] } }];

      const visited = registry.getVisitedSectionIds(sectionsWithFlow, {});
      expect(visited).toEqual(new Set(['s1']));
    });
  });
});
