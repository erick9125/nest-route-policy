import type { AuthorizationPrincipal } from './authorization-principal.js';
import type { ResourceAttributes } from './resource-attributes.js';

export interface AuthorizationContext {
  readonly principal: AuthorizationPrincipal | null;
  readonly resource?: unknown;
  readonly resourceAttributes?: ResourceAttributes;
  readonly action?: string;
  readonly resourceType?: string;
  readonly params: Readonly<Record<string, string>>;
  readonly query: Readonly<Record<string, unknown>>;
  readonly body?: Readonly<Record<string, unknown>>;
  readonly request: unknown;
}
