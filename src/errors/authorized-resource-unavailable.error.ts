import { PolicyEvaluationException } from './policy-evaluation.error.js';

export class AuthorizedResourceUnavailableError extends PolicyEvaluationException {
  constructor() {
    super(
      'No authorized resource is available on the request. ' +
        'Either the route policy does not declare a resource, or RoutePolicyGuard did not run for this route.',
    );
    this.name = 'AuthorizedResourceUnavailableError';
  }
}
