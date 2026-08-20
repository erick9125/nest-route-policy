import type { AuthorizationViolation } from '../models/authorization-violation.js';

/** Outcome of a single requirement: allowed, or denied with the reason why. */
export interface RequirementEvaluation {
  readonly allowed: boolean;
  readonly violation?: AuthorizationViolation;
}
