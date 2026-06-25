import type { FormDisplayPlugin } from '../pure-plugins';

export const allSectionsDisplayPlugin: FormDisplayPlugin = {
  name: 'all-sections',
  type: 'form-display',
  getDisplayMode() {
    return 'all-sections';
  },
};
