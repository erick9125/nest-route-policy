import type { PolicyHandler } from '../contracts/policy-handler.js';
import type { AuthorizationContext } from '../models/authorization-context.js';
import type { AuthorizationViolation } from '../models/authorization-violation.js';
import { PolicyHandlerNotFoundError } from '../../errors/policy-handler-not-found.error.js';
import type { PolicyHandlerRegistry } from '../../registry/policy-handler-registry.js';

export class CustomPolicyEvaluator {
  constructor(private readonly registry: PolicyHandlerRegistry) {}

  /**
   * Stops at the first handler that denies: every handler must allow, so the
   * decision is already settled and the remaining ones may cost I/O. Returns at
   * most one violation.
   */
  async evaluate(
    handlerNames: readonly string[],
    context: AuthorizationContext,
  ): Promise<readonly AuthorizationViolation[]> {
    for (const name of handlerNames) {
      const handler = this.requireHandler(name);
      const decision = await handler.evaluate(context);

      if (!decision.allowed) {
        return [
          {
            type: 'CUSTOM_POLICY_DENIED',
            message: describeDenial(name, decision.reason),
          },
        ];
      }
    }

    return [];
  }

  private requireHandler(name: string): PolicyHandler {
    const handler = this.registry.get(name);
    if (!handler) {
      throw new PolicyHandlerNotFoundError(name);
    }
    return handler;
  }
}

/**
 * The handler's own reason, when it gave one. Internal only: it reaches
 * `violations` and the decision log, never the HTTP response.
 */
function describeDenial(name: string, reason: string | undefined): string {
  const base = `Custom policy handler "${name}" denied the request`;
  return reason === undefined || reason.length === 0 ? `${base}.` : `${base}: ${reason}`;
}
