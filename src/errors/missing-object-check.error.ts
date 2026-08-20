import { PolicyEvaluationError } from './policy-evaluation.error.js';

export class MissingObjectCheckError extends PolicyEvaluationError {
  constructor(readonly resourceType: string) {
    super(
      `The policy for resource "${resourceType}" performs no object-level check. ` +
        'Add tenant: true, ownership: true, or a policy handler. ' +
        'Set unsafeSkipObjectCheck: true to opt out on purpose.',
    );
    this.name = 'MissingObjectCheckError';
  }
}
