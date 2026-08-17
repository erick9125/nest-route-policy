export interface AuthorizationDecision {
  readonly allowed: boolean;
  readonly reason?: string;
}
