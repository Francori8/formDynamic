# Contratos de Plugins

Los contratos son las interfaces que cada plugin debe implementar. Son la única forma en que el core interactúa con los plugins — nunca conoce los detalles internos.

---

## Tipos base compartidos

```typescript
// packages/plugin-contracts/src/base.ts

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface FlowCondition {
  fieldId: string;
  operator: "eq" | "neq" | "gt" | "lt" | "contains" | "is-empty" | "is-not-empty";
  value?: unknown;
}

export interface FieldConfig {
  id: string;
  label: string;
  required: boolean;
  sectionId: string;
  validators: Array<{
    name: string;
    config?: Record<string, unknown>;
  }>;
  options?: Record<string, unknown>; // específico de cada field-type
}

export interface Section {
  id: string;
  title?: string;
  fields: FieldConfig[];
}

export interface Form {
  id: string;
  title: string;
  sections: Section[];
}

export interface ResponsePayload {
  formId: string;
  responseId: string;
  respondentId?: string;
  answers: Record<string, unknown>; // fieldId -> valor
  submittedAt: Date;
}
```

---

## Plugins puros — paquete compartido

Estos plugins corren tanto en frontend como en backend. No pueden tener dependencias de Nest ni de Next.

### 1. `FieldTypePlugin`

Define el schema de un tipo de campo para que el frontend sepa renderizarlo.

```typescript
export interface FieldTypePlugin {
  name: string;
  type: "field-type";

  getSchema(config: FieldConfig): Record<string, unknown>;
}
```

Ejemplos built-in: `text`, `number`, `select`, `multi-select`, `date`, `file-upload`

### 2. `ValidatorPlugin`

Valida el valor de un campo. Se ejecuta en frontend (UX) y backend (seguridad).

```typescript
export interface ValidatorPlugin {
  name: string;
  type: "validator";

  validate(value: unknown, config: unknown): ValidationResult;
}
```

Ejemplos built-in: `required`, `min`, `max`, `min-length`, `max-length`, `regex`

Los validadores se configuran por campo en `FieldConfig.validators`:
```json
{
  "validators": [
    { "name": "required" },
    { "name": "min", "config": { "value": 0 } },
    { "name": "multiple-of", "config": { "value": 5 } }
  ]
}
```

### 3. `FieldVisibilityPlugin`

Muestra u oculta un campo individual según las respuestas actuales del formulario.

```typescript
export interface FieldVisibilityPlugin {
  name: string;
  type: "field-visibility";

  evaluate(
    condition: FlowCondition,
    currentAnswers: Record<string, unknown>
  ): { visible: boolean };
}
```

### 4. `SectionFlowPlugin`

Decide a qué sección saltar según las respuestas actuales.

```typescript
export interface SectionFlowPlugin {
  name: string;
  type: "section-flow";

  evaluate(
    condition: FlowCondition,
    currentAnswers: Record<string, unknown>
  ): { jumpToSectionId: string } | null;
}
```

---

## Plugins de backend — solo Nest

Estos plugins tienen side effects o dependen de infraestructura. Solo corren en el backend.

### 5. `AccessControlPlugin`

Decide si alguien puede ver o responder un formulario.

```typescript
export interface AccessContext {
  formId: string;
  respondentEmail?: string;
  token?: string;
  ipAddress?: string;
}

export interface AccessResult {
  allowed: boolean;
  reason?: string;
  respondentId?: string;
}

export interface AccessControlPlugin {
  name: string;
  type: "access-control";

  checkAccess(context: AccessContext): Promise<AccessResult>;
}
```

Ejemplos: `public-link` (cualquiera puede), `individual-link` (OTP por mail), `email-restricted` (lista de mails permitidos)

### 6. `ResponseHookPlugin`

Se ejecuta después de guardar una respuesta.

```typescript
export interface HookResult {
  success: boolean;
  error?: string;
}

export interface ResponseHookPlugin {
  name: string;
  type: "response-hook";

  onResponse(payload: ResponsePayload, config: unknown): Promise<HookResult>;
}
```

Ejemplos: `webhook` (POST a un endpoint externo), `email-notifier`, `slack-notifier`

### 7. `ExporterPlugin`

Genera un archivo con las respuestas de un formulario.

```typescript
export interface ExportInput {
  form: Form;
  responses: ResponsePayload[];
}

export interface ExportResult {
  filename: string;
  mimeType: string;
  content: Buffer | string;
}

export interface ExporterPlugin {
  name: string;
  type: "exporter";

  export(input: ExportInput): Promise<ExportResult>;
}
```

Ejemplos: `csv`, `json`, `pdf`

### 8. `AutocompletePlugin`

Devuelve sugerencias para un campo desde una fuente externa.

```typescript
export interface AutocompletePlugin {
  name: string;
  type: "autocomplete";

  suggest(query: string, config: unknown): Promise<string[]>;
}
```

---

## Tipo unión — lo que el registry maneja

```typescript
export type PurePlugin =
  | FieldTypePlugin
  | ValidatorPlugin
  | FieldVisibilityPlugin
  | SectionFlowPlugin;

export type BackendPlugin =
  | AccessControlPlugin
  | ResponseHookPlugin
  | ExporterPlugin
  | AutocompletePlugin;

export type Plugin = PurePlugin | BackendPlugin;

export type PluginType = Plugin["type"];
```

---

## Resumen

| Plugin | Tipo | Corre en | Cuándo actúa |
|--------|------|----------|--------------|
| `field-type` | puro | Frontend + Backend | Al renderizar el form |
| `validator` | puro | Frontend + Backend | Al validar cada campo |
| `field-visibility` | puro | Frontend + Backend | Al cambiar cualquier respuesta |
| `section-flow` | puro | Frontend + Backend | Al avanzar entre secciones |
| `access-control` | backend | Backend | Al intentar abrir/responder el form |
| `response-hook` | backend | Backend | Al guardar una respuesta |
| `exporter` | backend | Backend | On-demand al exportar |
| `autocomplete` | backend | Backend | Al escribir en un campo con autocomplete |
