export type RoleMode = 'any' | 'all';
export type ScopeMode = 'any' | 'all';

export interface RoutePolicy {
  readonly resource?: string;
  readonly action?: string;
  readonly roles?: readonly string[];
  readonly scopes?: readonly string[];
  readonly tenant?: boolean;
  readonly ownership?: boolean;
  readonly handlers?: readonly string[];
  readonly roleMode?: RoleMode;
  readonly scopeMode?: ScopeMode;
  /**
   * Declaring `resource` without `tenant`, `ownership`, or a handler loads the
   * object and hands it to the route without any object-level check, which is
   * the BOLA / IDOR class of bug this package exists to prevent. That policy is
   * rejected unless this flag opts out of the check on purpose.
   */
  readonly unsafeSkipObjectCheck?: boolean;
}
