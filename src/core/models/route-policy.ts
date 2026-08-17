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
}
