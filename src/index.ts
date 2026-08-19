export type { RoutePolicy, RoleMode, ScopeMode } from './core/models/route-policy.js';
export type { AuthorizationPrincipal } from './core/models/authorization-principal.js';
export type { AuthorizationContext } from './core/models/authorization-context.js';
export type { ResourceAttributes } from './core/models/resource-attributes.js';
export type { AuthorizationDecision } from './core/models/authorization-decision.js';
export type {
  AuthorizationResult,
  AuthorizationReason,
} from './core/models/authorization-result.js';
export { reasonFromViolation } from './core/models/authorization-result.js';
export type {
  AuthorizationViolation,
  AuthorizationViolationType,
} from './core/models/authorization-violation.js';

export type { PolicyHandler } from './core/contracts/policy-handler.js';
export type { ResourceResolver } from './core/contracts/resource-resolver.js';
export type { ResourceAttributesResolver } from './core/contracts/resource-attributes-resolver.js';

export { PolicyComposer } from './core/composition/policy-composer.js';
export type { ComposedRoutePolicy, PolicyDefaults } from './core/composition/policy-composer.js';

export { PolicyEvaluator } from './core/evaluation/policy-evaluator.js';
export { RoleEvaluator } from './core/evaluation/role-evaluator.js';
export { ScopeEvaluator } from './core/evaluation/scope-evaluator.js';
export { TenantEvaluator } from './core/evaluation/tenant-evaluator.js';
export { OwnershipEvaluator } from './core/evaluation/ownership-evaluator.js';
export { CustomPolicyEvaluator } from './core/evaluation/custom-policy-evaluator.js';

export { PolicyHandlerRegistry } from './registry/policy-handler-registry.js';
export { ResourceRegistry } from './registry/resource-registry.js';
export type { ResourceRegistration } from './registry/resource-registry.js';

export { PolicyEvaluationException } from './errors/policy-evaluation.error.js';
export { ResourceResolverNotFoundError } from './errors/resource-resolver-not-found.error.js';
export { PolicyHandlerNotFoundError } from './errors/policy-handler-not-found.error.js';
export { MissingObjectCheckError } from './errors/missing-object-check.error.js';
export { UnsupportedExecutionContextError } from './errors/unsupported-execution-context.error.js';
export { AuthorizedResourceUnavailableError } from './errors/authorized-resource-unavailable.error.js';
export { DuplicateRoutePolicyError } from './errors/duplicate-route-policy.error.js';

export { evaluatePolicy } from './testing/authorization-test-builder.js';
export type { EvaluatePolicyInput } from './testing/authorization-test-builder.js';
export { fakePrincipal } from './testing/fake-principal.js';
