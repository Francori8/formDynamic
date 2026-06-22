import type { SectionFlowPlugin } from '../pure-plugins';
import type { SectionFlow } from '../base';
import { evaluateCondition } from './evaluate-condition';

export const defaultSectionFlowPlugin: SectionFlowPlugin = {
  name: 'default-section-flow',
  type: 'section-flow',
  evaluate(
    flow: SectionFlow,
    currentAnswers: Record<string, unknown>,
    allSectionIds: string[],
    currentSectionId: string,
  ) {
    // Evaluar condiciones en orden — primera que matchea gana
    for (const rule of flow.conditions) {
      if (evaluateCondition(rule.condition, currentAnswers)) {
        return { nextSectionId: rule.jumpToSectionId };
      }
    }

    // Ninguna condición matcheó — seguir orden natural
    const currentIndex = allSectionIds.indexOf(currentSectionId);
    const nextId = allSectionIds[currentIndex + 1] ?? null;
    return { nextSectionId: nextId };
  },
};
