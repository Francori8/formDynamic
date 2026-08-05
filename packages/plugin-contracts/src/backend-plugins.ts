import type { Form, ResponsePayload, Respondent } from './base';

export interface FormLinkContext {
  id: string;
  maxResponses: number | null;
  responseCount: number;
}

export interface AccessContext {
  formId: string;
  token?: string;         // token del FormLink si se accede por /l/:token
  link?: FormLinkContext; // el link resuelto por el core, si aplica
  verifiedEmail?: string; // email verificado por otp-auth, disponible para plugins posteriores
  ipAddress?: string;
}

export interface AccessResult {
  allowed: boolean;
  reason?: string;
  respondent?: Respondent; // el plugin que verificó identidad lo completa
}

export interface AccessControlPlugin {
  name: string;
  type: 'access-control';
  // context es mutable — un plugin puede enriquecerlo (ej: otp-auth escribe verifiedEmail)
  // para que plugins posteriores en la cadena lo lean
  // config es la entrada de pluginConfig[name] del form — permite que el plugin sepa si el
  // owner lo activó explícitamente, en vez de decidir solo por datos incidentales del contexto
  checkAccess(context: AccessContext, config?: unknown): Promise<AccessResult>;
}

export interface HookResult {
  success: boolean;
  error?: string;
}

export interface ResponseHookPlugin {
  name: string;
  type: 'response-hook';
  onResponse(payload: ResponsePayload, config: unknown): Promise<HookResult>;
}

export interface ExportInput {
  form: Form;
  responses: ResponsePayload[];
}

export interface ExportResult {
  filename: string;
  mimeType: string;
  content: Uint8Array | string;
}

export interface ExporterPlugin {
  name: string;
  type: 'exporter';
  export(input: ExportInput): Promise<ExportResult>;
}

export interface AutocompletePlugin {
  name: string;
  type: 'autocomplete';
  suggest(query: string, config: unknown): Promise<string[]>;
}

export type BackendPlugin =
  | AccessControlPlugin
  | ResponseHookPlugin
  | ExporterPlugin
  | AutocompletePlugin;
