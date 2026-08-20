import type { ModuleMetadata, Type } from '@nestjs/common';
import type { PolicyHandler } from '../core/contracts/policy-handler.js';
import type { ResourceAttributesResolver } from '../core/contracts/resource-attributes-resolver.js';
import type { ResourceResolver } from '../core/contracts/resource-resolver.js';
import type { AuthorizationReason } from '../core/models/authorization-result.js';
import type { AuthorizationViolationType } from '../core/models/authorization-violation.js';
import type { RoleMode, ScopeMode } from '../core/models/route-policy.js';
import type { PrincipalResolver } from './resolvers/principal-resolver.js';

/**
 * One authorization decision, safe to persist as an audit record.
 *
 * Carries violation *types*, never their messages: a message can quote a
 * handler's own reason, which is domain data. Nothing here identifies the
 * resource instance, and the request, its body, and the resolved resource are
 * deliberately absent.
 */
export interface AuthorizationDecisionEvent {
  readonly allowed: boolean;
  readonly reason: AuthorizationReason;
  readonly principalId?: string;
  readonly resource?: string;
  readonly action?: string;
  readonly violations: readonly AuthorizationViolationType[];
}

export interface RoutePolicyLogger {
  warn(message: string): void;
  /** Called for every decision, allowed or denied, when implemented. */
  decision?(event: AuthorizationDecisionEvent): void;
}

export interface ResourceDefinition {
  readonly resolver: Type<ResourceResolver>;
  readonly attributes: Type<ResourceAttributesResolver>;
}

export interface RoutePolicyModuleOptions {
  readonly imports?: ModuleMetadata['imports'];
  readonly principalResolver?: Type<PrincipalResolver>;
  readonly defaults?: {
    readonly roleMode?: RoleMode;
    readonly scopeMode?: ScopeMode;
  };
  readonly resources?: Readonly<Record<string, ResourceDefinition>>;
  readonly policies?: readonly Type<PolicyHandler>[];
  readonly logger?: RoutePolicyLogger;
}
