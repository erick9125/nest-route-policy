import { PolicyEvaluationException } from './policy-evaluation.error.js';

export class MissingResourceTypeError extends PolicyEvaluationException {
  constructor() {
    super('Tenant and ownership checks require a resource type on the policy.');
    this.name = 'MissingResourceTypeError';
  }
}
