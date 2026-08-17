import type { AuthorizationPrincipal } from '../core/models/authorization-principal.js';

export function fakePrincipal(
  overrides: Partial<AuthorizationPrincipal> = {},
): AuthorizationPrincipal {
  return {
    id: 'user-1',
    roles: [],
    scopes: [],
    ...overrides,
  };
}
