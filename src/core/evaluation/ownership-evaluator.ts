import type { AuthorizationPrincipal } from '../models/authorization-principal.js';
import type { ResourceAttributes } from '../models/resource-attributes.js';
import type { RequirementEvaluation } from './requirement-evaluation.js';

export class OwnershipEvaluator {
  evaluate(
    principal: AuthorizationPrincipal,
    resourceAttributes: ResourceAttributes | undefined,
  ): RequirementEvaluation {
    const ownerId = resourceAttributes?.ownerId;

    if (ownerId === undefined || ownerId.length === 0 || principal.id !== ownerId) {
      return {
        allowed: false,
        violation: {
          type: 'OWNERSHIP_MISMATCH',
          message: 'Principal does not own the requested resource.',
        },
      };
    }

    return { allowed: true };
  }
}
