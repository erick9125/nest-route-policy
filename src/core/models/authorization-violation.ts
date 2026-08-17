export type AuthorizationViolationType =
  | 'UNAUTHENTICATED'
  | 'MISSING_ROLE'
  | 'MISSING_SCOPE'
  | 'TENANT_MISMATCH'
  | 'OWNERSHIP_MISMATCH'
  | 'RESOURCE_NOT_FOUND'
  | 'CUSTOM_POLICY_DENIED';

export interface AuthorizationViolation {
  readonly type: AuthorizationViolationType;
  readonly message: string;
}
