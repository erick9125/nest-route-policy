export class PolicyEvaluationException extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PolicyEvaluationException';
  }
}
