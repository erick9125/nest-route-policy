export interface AuthorizationPrincipal {
  readonly id: string;
  readonly roles?: readonly string[];
  readonly scopes?: readonly string[];
  readonly tenantId?: string;
  readonly attributes?: Readonly<Record<string, unknown>>;
}
