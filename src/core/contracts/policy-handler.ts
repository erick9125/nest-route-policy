import type { AuthorizationContext } from '../models/authorization-context.js';
import type { AuthorizationDecision } from '../models/authorization-decision.js';

export interface PolicyHandler {
  readonly name: string;

  evaluate(context: AuthorizationContext): AuthorizationDecision | Promise<AuthorizationDecision>;
}
