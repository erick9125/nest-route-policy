import type {
  AuthorizationViolation,
  AuthorizationViolationType,
} from './authorization-violation.js';

export type AuthorizationReason =
  | 'allowed'
  | 'unauthenticated'
  | 'missing_role'
  | 'missing_scope'
  | 'tenant_mismatch'
  | 'ownership_mismatch'
  | 'resource_not_found'
  | 'custom_policy_denied';

export interface AuthorizationResult {
  readonly allowed: boolean;
  readonly reason: AuthorizationReason;
  readonly violations: readonly AuthorizationViolation[];
}

const REASON_BY_VIOLATION: Record<AuthorizationViolationType, AuthorizationReason> = {
  UNAUTHENTICATED: 'unauthenticated',
  MISSING_ROLE: 'missing_role',
  MISSING_SCOPE: 'missing_scope',
  TENANT_MISMATCH: 'tenant_mismatch',
  OWNERSHIP_MISMATCH: 'ownership_mismatch',
  RESOURCE_NOT_FOUND: 'resource_not_found',
  CUSTOM_POLICY_DENIED: 'custom_policy_denied',
};

export function reasonFromViolation(type: AuthorizationViolationType): AuthorizationReason {
  return REASON_BY_VIOLATION[type];
}
