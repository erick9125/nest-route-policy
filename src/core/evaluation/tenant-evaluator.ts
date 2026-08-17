import type { AuthorizationPrincipal } from '../models/authorization-principal.js';
import type { ResourceAttributes } from '../models/resource-attributes.js';
import type { RequirementEvaluation } from './role-evaluator.js';

export class TenantEvaluator {
  evaluate(
    principal: AuthorizationPrincipal,
    resourceAttributes: ResourceAttributes | undefined,
  ): RequirementEvaluation {
    const principalTenant = principal.tenantId;
    const resourceTenant = resourceAttributes?.tenantId;

    if (
      principalTenant === undefined ||
      principalTenant.length === 0 ||
      resourceTenant === undefined ||
      resourceTenant.length === 0 ||
      principalTenant !== resourceTenant
    ) {
      return {
        allowed: false,
        violation: {
          type: 'TENANT_MISMATCH',
          message: 'Principal and resource tenants do not match.',
        },
      };
    }

    return { allowed: true };
  }
}
