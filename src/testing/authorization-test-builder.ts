import type { PolicyHandler } from '../core/contracts/policy-handler.js';
import { PolicyComposer } from '../core/composition/policy-composer.js';
import type { PolicyDefaults } from '../core/composition/policy-composer.js';
import { PolicyEvaluator } from '../core/evaluation/policy-evaluator.js';
import type { AuthorizationPrincipal } from '../core/models/authorization-principal.js';
import type { AuthorizationResult } from '../core/models/authorization-result.js';
import type { ResourceAttributes } from '../core/models/resource-attributes.js';
import type { RoutePolicy } from '../core/models/route-policy.js';
import { PolicyHandlerRegistry } from '../registry/policy-handler-registry.js';

export interface EvaluatePolicyInput {
  readonly policy: RoutePolicy;
  readonly principal?: AuthorizationPrincipal | null;
  readonly resource?: unknown;
  readonly resourceAttributes?: ResourceAttributes;
  readonly handlers?: readonly PolicyHandler[];
  readonly defaults?: PolicyDefaults;
  readonly params?: Readonly<Record<string, string>>;
  readonly query?: Readonly<Record<string, unknown>>;
}

export async function evaluatePolicy(input: EvaluatePolicyInput): Promise<AuthorizationResult> {
  const registry = new PolicyHandlerRegistry();
  for (const handler of input.handlers ?? []) {
    registry.register(handler);
  }

  const evaluator = new PolicyEvaluator(registry);
  const policy = PolicyComposer.from(input.policy, input.defaults);

  return evaluator.evaluate(policy, {
    principal: input.principal ?? null,
    params: input.params ?? {},
    query: input.query ?? {},
    request: {},
    ...(input.resource !== undefined ? { resource: input.resource } : {}),
    ...(input.resourceAttributes !== undefined
      ? { resourceAttributes: input.resourceAttributes }
      : {}),
    ...(input.policy.action !== undefined ? { action: input.policy.action } : {}),
    ...(input.policy.resource !== undefined ? { resourceType: input.policy.resource } : {}),
  });
}
