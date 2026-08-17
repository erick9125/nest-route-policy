import { PolicyEvaluationException } from './policy-evaluation.error.js';

export class PolicyHandlerNotFoundError extends PolicyEvaluationException {
  constructor(readonly handlerName: string) {
    super(`No policy handler is registered for "${handlerName}".`);
    this.name = 'PolicyHandlerNotFoundError';
  }
}
