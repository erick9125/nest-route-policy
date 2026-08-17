import { PolicyEvaluationException } from './policy-evaluation.error.js';

export class ResourceResolverNotFoundError extends PolicyEvaluationException {
  constructor(readonly resourceType: string) {
    super(`No resource resolver is registered for "${resourceType}".`);
    this.name = 'ResourceResolverNotFoundError';
  }
}
