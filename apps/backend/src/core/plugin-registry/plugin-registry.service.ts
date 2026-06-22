import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type {
  Plugin,
  PluginType,
  FieldTypePlugin,
  ValidatorPlugin,
  FieldVisibilityPlugin,
  SectionFlowPlugin,
  AccessControlPlugin,
  ResponseHookPlugin,
  ExporterPlugin,
  AutocompletePlugin,
  Section,
  SectionFlow,
} from '@formdynamic/plugin-contracts';

type PluginMap<T extends Plugin> = Map<string, T>;

@Injectable()
export class PluginRegistryService implements OnModuleInit {
  private readonly logger = new Logger(PluginRegistryService.name);

  private readonly registry: {
    'field-type': PluginMap<FieldTypePlugin>;
    'validator': PluginMap<ValidatorPlugin>;
    'field-visibility': PluginMap<FieldVisibilityPlugin>;
    'section-flow': PluginMap<SectionFlowPlugin>;
    'access-control': PluginMap<AccessControlPlugin>;
    'response-hook': PluginMap<ResponseHookPlugin>;
    'exporter': PluginMap<ExporterPlugin>;
    'autocomplete': PluginMap<AutocompletePlugin>;
  } = {
    'field-type': new Map(),
    'validator': new Map(),
    'field-visibility': new Map(),
    'section-flow': new Map(),
    'access-control': new Map(),
    'response-hook': new Map(),
    'exporter': new Map(),
    'autocomplete': new Map(),
  };

  onModuleInit() {
    const counts = Object.entries(this.registry)
      .map(([type, map]) => `${type}(${map.size})`)
      .join(', ');
    this.logger.log(`Plugin registry initialized — ${counts}`);
  }

  register(plugin: Plugin): void {
    const map = this.registry[plugin.type] as PluginMap<typeof plugin>;

    if (map.has(plugin.name)) {
      this.logger.warn(
        `Plugin "${plugin.name}" (${plugin.type}) already registered — overwriting`,
      );
    }

    map.set(plugin.name, plugin as never);
    this.logger.log(`Plugin registered: [${plugin.type}] ${plugin.name}`);
  }

  getFieldType(name: string): FieldTypePlugin {
    return this.getOrThrow('field-type', name);
  }

  getValidator(name: string): ValidatorPlugin {
    return this.getOrThrow('validator', name);
  }

  getFieldVisibility(name: string): FieldVisibilityPlugin {
    return this.getOrThrow('field-visibility', name);
  }

  getFieldVisibilityPlugins(): FieldVisibilityPlugin[] {
    return Array.from(this.registry['field-visibility'].values());
  }

  getSectionFlow(name: string): SectionFlowPlugin {
    return this.getOrThrow('section-flow', name);
  }

  getAccessControl(name: string): AccessControlPlugin {
    return this.getOrThrow('access-control', name);
  }

  getSectionFlowPlugins(): SectionFlowPlugin[] {
    return Array.from(this.registry['section-flow'].values());
  }

  // Dado el conjunto de secciones y las respuestas actuales, devuelve los IDs
  // de las secciones que el flujo realmente recorre (las demás se ignoran al validar).
  getVisitedSectionIds(sections: Section[], answers: Record<string, unknown>): Set<string> {
    const plugins = this.getSectionFlowPlugins();
    const allIds = sections.map((s) => s.id);
    const visited = new Set<string>();

    let currentId: string | null = allIds[0] ?? null;
    const maxSteps = allIds.length + 1; // evitar loops infinitos
    let steps = 0;

    while (currentId !== null && steps < maxSteps) {
      visited.add(currentId);
      steps++;

      const section = sections.find((s) => s.id === currentId);
      if (!section?.flow || plugins.length === 0) {
        // sin flow configurado → orden natural
        const idx = allIds.indexOf(currentId);
        currentId = allIds[idx + 1] ?? null;
      } else {
        const { nextSectionId } = plugins[0].evaluate(
          section.flow as SectionFlow,
          answers,
          allIds,
          currentId,
        );
        currentId = nextSectionId;
      }
    }

    return visited;
  }

  getAccessControlPlugins(): AccessControlPlugin[] {
    return Array.from(this.registry['access-control'].values());
  }

  getResponseHook(name: string): ResponseHookPlugin {
    return this.getOrThrow('response-hook', name);
  }

  getExporter(name: string): ExporterPlugin {
    return this.getOrThrow('exporter', name);
  }

  getAutocomplete(name: string): AutocompletePlugin {
    return this.getOrThrow('autocomplete', name);
  }

  listByType(type: PluginType): string[] {
    return Array.from(this.registry[type].keys());
  }

  private getOrThrow<T extends Plugin>(type: PluginType, name: string): T {
    const plugin = this.registry[type].get(name);
    if (!plugin) {
      throw new Error(`Plugin not found: [${type}] "${name}"`);
    }
    return plugin as T;
  }
}
