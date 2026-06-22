import type { Section } from '@formdynamic/plugin-contracts';

export interface PluginConfigDto {
  webhook?: { enabled: boolean; url?: string };
  [key: string]: unknown;
}

export interface CreateFormDto {
  title: string;
  sections: Section[];
  pluginConfig?: PluginConfigDto;
}

export interface UpdateFormPluginConfigDto {
  pluginConfig: PluginConfigDto;
}

export interface UpdateFormContentDto {
  title?: string;
  sections?: Section[];
}

export type FormStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';

export interface UpdateFormStatusDto {
  status: FormStatus;
}
