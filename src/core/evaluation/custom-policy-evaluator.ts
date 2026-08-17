import type { PolicyHandler } from '../contracts/policy-handler.js';
import type { AuthorizationContext } from '../models/authorization-context.js';
import type { AuthorizationViolation } from '../models/authorization-violation.js';
import { PolicyHandlerNotFoundError } from '../../errors/policy-handler-not-found.error.js';
import type { PolicyHandlerRegistry } from '../../registry/policy-handler-registry.js';

export class CustomPolicyEvaluator {
  constructor(private readonly registry: PolicyHandlerRegistry) {}

  async evaluate(
    handlerNames: readonly string[],
    context: AuthorizationContext,
  ): Promise<readonly AuthorizationViolation[]> {
    const violations: AuthorizationViolation[] = [];

    for (const name of handlerNames) {
      const handler = this.requireHandler(name);
      const decision = await handler.evaluate(context);

      if (!decision.allowed) {
        violations.push({
          type: 'CUSTOM_POLICY_DENIED',
          message: `Custom policy handler "${name}" denied the request.`,
        });
      }
    }

    return violations;
  }

  private requireHandler(name: string): PolicyHandler {
    const handler = this.registry.get(name);
    if (!handler) {
      throw new PolicyHandlerNotFoundError(name);
    }
    return handler;
  }
}
