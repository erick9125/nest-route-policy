import { ForbiddenException } from '@nestjs/common';
import type { AuthorizationResult } from '../core/models/authorization-result.js';

export class RoutePolicyDeniedException extends ForbiddenException {
  readonly #authorizationResult: AuthorizationResult;

  constructor(result: AuthorizationResult) {
    super('Forbidden');
    this.#authorizationResult = result;
  }

  getAuthorizationResult(): AuthorizationResult {
    return this.#authorizationResult;
  }
}
