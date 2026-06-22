export * from './base';
export * from './pure-plugins';
export * from './backend-plugins';
export * from './plugins/default-visibility';
export * from './plugins/default-section-flow';

import type { PurePlugin } from './pure-plugins';
import type { BackendPlugin } from './backend-plugins';

export type Plugin = PurePlugin | BackendPlugin;
export type PluginType = Plugin['type'];
