import type { AuthorizationPrincipal } from '../models/authorization-principal.js';
import type { ScopeMode } from '../models/route-policy.js';
import type { RequirementEvaluation } from './requirement-evaluation.js';

export class ScopeEvaluator {
  evaluate(
    requiredScopes: readonly string[],
    principal: AuthorizationPrincipal,
    mode: ScopeMode,
  ): RequirementEvaluation {
    if (requiredScopes.length === 0) {
      return { allowed: true };
    }

    const principalScopes = principal.scopes ?? [];
    const satisfied =
      mode === 'any'
        ? requiredScopes.some((scope) => principalScopes.includes(scope))
        : requiredScopes.every((scope) => principalScopes.includes(scope));

    if (!satisfied) {
      return {
        allowed: false,
        violation: {
          type: 'MISSING_SCOPE',
          message: 'Principal does not satisfy the required scopes.',
        },
      };
    }

    return { allowed: true };
  }
}
