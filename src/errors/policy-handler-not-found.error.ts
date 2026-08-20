import { PolicyEvaluationError } from './policy-evaluation.error.js';

export class PolicyHandlerNotFoundError extends PolicyEvaluationError {
  constructor(readonly handlerName: string) {
    super(`No policy handler is registered for "${handlerName}".`);
    this.name = 'PolicyHandlerNotFoundError';
  }
}
