import type { FlowCondition } from '../base';

export function evaluateCondition(condition: FlowCondition, answers: Record<string, unknown>): boolean {
  const value = answers[condition.fieldId];
  const cv = condition.value;

  switch (condition.operator) {
    case 'eq':           return String(value) === String(cv);
    case 'neq':          return String(value) !== String(cv);
    case 'gt':           return Number(value) > Number(cv);
    case 'lt':           return Number(value) < Number(cv);
    case 'contains':     return String(value ?? '').toLowerCase().includes(String(cv ?? '').toLowerCase());
    case 'is-empty':     return value === undefined || value === null || value === '';
    case 'is-not-empty': return value !== undefined && value !== null && value !== '';
    default:             return false;
  }
}
