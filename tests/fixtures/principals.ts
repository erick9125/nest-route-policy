import type { AuthorizationPrincipal } from '../../src/core/models/authorization-principal.js';
import { ADMIN_A, MANAGER_A, TENANT_A, TENANT_B, USER_A, USER_B } from './invoices.js';

export const principals = {
  userA: {
    id: USER_A,
    tenantId: TENANT_A,
    roles: [],
    scopes: ['invoice:access', 'invoice:read'],
  },
  userB: {
    id: USER_B,
    tenantId: TENANT_B,
    roles: [],
    scopes: ['invoice:access', 'invoice:read'],
  },
  managerA: {
    id: MANAGER_A,
    tenantId: TENANT_A,
    roles: ['manager'],
    scopes: ['invoice:access', 'invoice:read', 'invoice:approve'],
  },
  adminA: {
    id: ADMIN_A,
    tenantId: TENANT_A,
    roles: ['admin'],
    scopes: ['invoice:access', 'invoice:read'],
  },
} satisfies Record<string, AuthorizationPrincipal>;

export function principalById(id: string | undefined): AuthorizationPrincipal | null {
  if (!id) {
    return null;
  }

  return Object.values(principals).find((principal) => principal.id === id) ?? null;
}
