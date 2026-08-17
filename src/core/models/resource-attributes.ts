export interface ResourceAttributes {
  readonly ownerId?: string;
  readonly tenantId?: string;
  readonly attributes?: Readonly<Record<string, unknown>>;
}
