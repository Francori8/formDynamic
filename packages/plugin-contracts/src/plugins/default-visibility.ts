import type { FieldVisibilityPlugin } from '../pure-plugins';
import type { FlowCondition } from '../base';
import { evaluateCondition } from './evaluate-condition';

export const defaultVisibilityPlugin: FieldVisibilityPlugin = {
  name: 'default-visibility',
  type: 'field-visibility',
  evaluate(condition: FlowCondition, currentAnswers: Record<string, unknown>) {
    return { visible: evaluateCondition(condition, currentAnswers) };
  },
};
