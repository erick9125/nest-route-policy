import type { AuthorizationPrincipal } from '../models/authorization-principal.js';
import type { AuthorizationViolation } from '../models/authorization-violation.js';
import type { RoleMode } from '../models/route-policy.js';

export interface RequirementEvaluation {
  readonly allowed: boolean;
  readonly violation?: AuthorizationViolation;
}

export class RoleEvaluator {
  evaluate(
    roleGroups: readonly (readonly string[])[],
    principal: AuthorizationPrincipal,
    mode: RoleMode,
  ): RequirementEvaluation {
    const principalRoles = principal.roles ?? [];

    for (const group of roleGroups) {
      if (group.length === 0) {
        continue;
      }

      const satisfied =
        mode === 'all'
          ? group.every((role) => principalRoles.includes(role))
          : group.some((role) => principalRoles.includes(role));

      if (!satisfied) {
        return {
          allowed: false,
          violation: {
            type: 'MISSING_ROLE',
            message: 'Principal does not satisfy the required roles.',
          },
        };
      }
    }

    return { allowed: true };
  }
}
