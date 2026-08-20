import type { PolicyHandler } from '../core/contracts/policy-handler.js';
import { PolicyEvaluationError } from '../errors/policy-evaluation.error.js';

export class PolicyHandlerRegistry {
  private readonly handlers = new Map<string, PolicyHandler>();

  register(handler: PolicyHandler): void {
    if (this.handlers.has(handler.name)) {
      throw new PolicyEvaluationError(`Duplicate policy handler: "${handler.name}".`);
    }

    this.handlers.set(handler.name, handler);
  }

  get(name: string): PolicyHandler | undefined {
    return this.handlers.get(name);
  }
}
