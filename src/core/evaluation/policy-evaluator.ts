import { PolicyEvaluationException } from '../../errors/policy-evaluation.error.js';
import type { AuthorizationContext } from '../models/authorization-context.js';
import type { AuthorizationPrincipal } from '../models/authorization-principal.js';
import {
  type AuthorizationResult,
  reasonFromViolation,
} from '../models/authorization-result.js';
import type { AuthorizationViolation } from '../models/authorization-violation.js';
import type { ComposedRoutePolicy } from '../composition/policy-composer.js';
import { CustomPolicyEvaluator } from './custom-policy-evaluator.js';
import { OwnershipEvaluator } from './ownership-evaluator.js';
import { RoleEvaluator } from './role-evaluator.js';
import { ScopeEvaluator } from './scope-evaluator.js';
import { TenantEvaluator } from './tenant-evaluator.js';
import type { PolicyHandlerRegistry } from '../../registry/policy-handler-registry.js';

export class PolicyEvaluator {
  private readonly roleEvaluator = new RoleEvaluator();
  private readonly scopeEvaluator = new ScopeEvaluator();
  private readonly tenantEvaluator = new TenantEvaluator();
  private readonly ownershipEvaluator = new OwnershipEvaluator();
  private readonly customPolicyEvaluator: CustomPolicyEvaluator;

  constructor(handlerRegistry: PolicyHandlerRegistry) {
    this.customPolicyEvaluator = new CustomPolicyEvaluator(handlerRegistry);
  }

  async evaluate(
    policy: ComposedRoutePolicy,
    context: AuthorizationContext,
  ): Promise<AuthorizationResult> {
    if (!isUsablePrincipal(context.principal)) {
      return deny({
        type: 'UNAUTHENTICATED',
        message: 'An authenticated principal is required.',
      });
    }

    const principal = context.principal;
    const violations: AuthorizationViolation[] = [];
    const resourceRequired =
      policy.resource !== undefined || policy.tenant || policy.ownership;

    if (policy.tenant || policy.ownership) {
      if (policy.resource === undefined) {
        throw new PolicyEvaluationException(
          'Tenant and ownership checks require a resource type on the policy.',
        );
      }
    }

    if (resourceRequired && (context.resource === undefined || context.resource === null)) {
      return deny({
        type: 'RESOURCE_NOT_FOUND',
        message: 'The requested resource is not available.',
      });
    }

    const roles = this.roleEvaluator.evaluate(policy.roleGroups, principal, policy.roleMode);
    if (!roles.allowed && roles.violation) {
      violations.push(roles.violation);
    }

    const scopes = this.scopeEvaluator.evaluate(policy.scopes, principal, policy.scopeMode);
    if (!scopes.allowed && scopes.violation) {
      violations.push(scopes.violation);
    }

    if (policy.tenant) {
      const tenant = this.tenantEvaluator.evaluate(principal, context.resourceAttributes);
      if (!tenant.allowed && tenant.violation) {
        violations.push(tenant.violation);
      }
    }

    if (policy.ownership) {
      const ownership = this.ownershipEvaluator.evaluate(principal, context.resourceAttributes);
      if (!ownership.allowed && ownership.violation) {
        violations.push(ownership.violation);
      }
    }

    if (policy.handlers.length > 0) {
      const customViolations = await this.customPolicyEvaluator.evaluate(policy.handlers, context);
      violations.push(...customViolations);
    }

    const first = violations[0];
    if (!first) {
      return { allowed: true, reason: 'allowed', violations: [] };
    }

    return {
      allowed: false,
      reason: reasonFromViolation(first.type),
      violations,
    };
  }
}

function isUsablePrincipal(
  principal: AuthorizationPrincipal | null,
): principal is AuthorizationPrincipal {
  return principal !== null && principal.id.length > 0;
}

function deny(violation: AuthorizationViolation): AuthorizationResult {
  return {
    allowed: false,
    reason: reasonFromViolation(violation.type),
    violations: [violation],
  };
}
