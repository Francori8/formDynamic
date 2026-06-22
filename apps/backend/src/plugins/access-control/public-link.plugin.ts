import type { AccessControlPlugin, AccessContext, AccessResult } from '@formdynamic/plugin-contracts';

export const publicLinkPlugin: AccessControlPlugin = {
  name: 'public-link',
  type: 'access-control',

  async checkAccess(_context: AccessContext): Promise<AccessResult> {
    return { allowed: true };
  },
};
