import type { FieldConfig, FlowCondition, SectionFlow, ValidationResult } from './base';

export interface FieldTypePlugin {
  name: string;
  label: string;
  type: 'field-type';
  getSchema(config: FieldConfig): Record<string, unknown>;
  // Validación implícita del tipo — se ejecuta siempre, sin configuración del usuario
  validate?(value: unknown): ValidationResult;
}

export interface ValidatorPlugin {
  name: string;
  type: 'validator';
  validate(value: unknown, config: unknown): ValidationResult;
}

export interface FieldVisibilityPlugin {
  name: string;
  type: 'field-visibility';
  evaluate(
    condition: FlowCondition,
    currentAnswers: Record<string, unknown>,
  ): { visible: boolean };
}

export interface SectionFlowPlugin {
  name: string;
  type: 'section-flow';
  // Evalúa las condiciones del flow de una sección y devuelve el ID de la sección siguiente.
  // Retorna null si ninguna condición matchea (seguir orden natural) o si se debe hacer submit.
  evaluate(
    flow: SectionFlow,
    currentAnswers: Record<string, unknown>,
    allSectionIds: string[],      // para calcular "siguiente en orden natural"
    currentSectionId: string,
  ): { nextSectionId: string | null }; // null = submit (no hay más secciones)
}

export type PurePlugin =
  | FieldTypePlugin
  | ValidatorPlugin
  | FieldVisibilityPlugin
  | SectionFlowPlugin;
