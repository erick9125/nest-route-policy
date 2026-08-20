import type { ExecutionContext } from '@nestjs/common';
import type { AuthorizationPrincipal } from '../../core/models/authorization-principal.js';

export interface PrincipalResolver {
  resolve(
    context: ExecutionContext,
  ): AuthorizationPrincipal | null | Promise<AuthorizationPrincipal | null>;
}
