import type { ModuleMetadata, Type } from '@nestjs/common';
import type { PolicyHandler } from '../core/contracts/policy-handler.js';
import type { ResourceAttributesResolver } from '../core/contracts/resource-attributes-resolver.js';
import type { ResourceResolver } from '../core/contracts/resource-resolver.js';
import type { RoleMode, ScopeMode } from '../core/models/route-policy.js';
import type { PrincipalResolver } from './resolvers/principal-resolver.js';

export interface RoutePolicyLogger {
  warn(message: string): void;
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
