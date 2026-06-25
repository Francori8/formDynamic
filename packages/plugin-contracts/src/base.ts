export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface FlowCondition {
  fieldId: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'is-empty' | 'is-not-empty';
  value?: unknown;
}

export interface ValidatorConfig {
  name: string;
  config?: Record<string, unknown>;
}

export interface FieldConfig {
  id: string;
  type: string;
  label: string;
  required: boolean;
  sectionId: string;
  validators: ValidatorConfig[];
  options?: Record<string, unknown>;
  visibility?: FlowCondition; // si está, el campo solo es visible cuando la condición se cumple
}

export interface SectionFlowRule {
  condition: FlowCondition;
  jumpToSectionId: string;
}

export interface SectionFlow {
  conditions: SectionFlowRule[];
  defaultJumpToSectionId?: string; // si ninguna condición matchea y está definido, salta a esta sección; si no, sigue el orden natural
}

export interface Section {
  id: string;
  title?: string;
  fields: FieldConfig[];
  flow?: SectionFlow;
}

export interface Form {
  id: string;
  title: string;
  sections: Section[];
}

export interface Respondent {
  id: string;      // el valor opaco: email, userId, lo que el plugin defina
  type: string;    // "email" | "user-id" | lo que el plugin defina
  plugin: string;  // nombre del plugin que verificó la identidad
}

export interface ResponsePayload {
  formId: string;
  responseId: string;
  respondent?: Respondent;
  answers: Record<string, unknown>;
  submittedAt: Date;
}
