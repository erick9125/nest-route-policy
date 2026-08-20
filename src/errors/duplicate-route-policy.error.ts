import { PolicyEvaluationError } from './policy-evaluation.error.js';

export class DuplicateRoutePolicyError extends PolicyEvaluationError {
  constructor(readonly target: string) {
    super(
      `More than one @Authorize() is applied to "${target}". ` +
        'Metadata is overwritten, so one of the policies would be silently discarded. Merge them into a single @Authorize().',
    );
    this.name = 'DuplicateRoutePolicyError';
  }
}
