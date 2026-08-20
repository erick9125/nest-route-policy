export class PolicyEvaluationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PolicyEvaluationError';
  }
}
