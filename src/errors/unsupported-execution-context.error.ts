import { PolicyEvaluationException } from './policy-evaluation.error.js';

export class UnsupportedExecutionContextError extends PolicyEvaluationException {
  constructor(readonly contextType: string) {
    super(
      `Route policies can only be evaluated for HTTP contexts, but the context type was "${contextType}".`,
    );
    this.name = 'UnsupportedExecutionContextError';
  }
}
