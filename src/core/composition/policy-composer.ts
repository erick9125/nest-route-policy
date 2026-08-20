import { MissingObjectCheckError } from '../../errors/missing-object-check.error.js';
import { MissingResourceTypeError } from '../../errors/missing-resource-type.error.js';
import type { RoleMode, RoutePolicy, ScopeMode } from '../models/route-policy.js';

export interface PolicyDefaults {
  readonly roleMode?: RoleMode;
  readonly scopeMode?: ScopeMode;
}

export interface ComposedRoutePolicy {
  readonly resource?: string;
  readonly action?: string;
  readonly roleGroups: readonly (readonly string[])[];
  readonly scopes: readonly string[];
  readonly tenant: boolean;
  readonly ownership: boolean;
  readonly handlers: readonly string[];
  readonly roleMode: RoleMode;
  readonly scopeMode: ScopeMode;
  readonly unsafeSkipObjectCheck: boolean;
}

export class PolicyComposer {
  static from(policy: RoutePolicy, defaults: PolicyDefaults = {}): ComposedRoutePolicy {
    return PolicyComposer.build(undefined, policy, defaults);
  }

  static compose(
    classPolicy: RoutePolicy | undefined,
    methodPolicy: RoutePolicy | undefined,
    defaults: PolicyDefaults = {},
  ): ComposedRoutePolicy | null {
    if (!classPolicy && !methodPolicy) {
      return null;
    }

    return PolicyComposer.build(classPolicy, methodPolicy, defaults);
  }

  private static build(
    classPolicy: RoutePolicy | undefined,
    methodPolicy: RoutePolicy | undefined,
    defaults: PolicyDefaults,
  ): ComposedRoutePolicy {
    const resource = methodPolicy?.resource ?? classPolicy?.resource;
    const action = methodPolicy?.action ?? classPolicy?.action;
    const roleMode = methodPolicy?.roleMode ?? classPolicy?.roleMode ?? defaults.roleMode ?? 'any';
    const scopeMode =
      methodPolicy?.scopeMode ?? classPolicy?.scopeMode ?? defaults.scopeMode ?? 'all';

    const roleGroups: (readonly string[])[] = [];
    if (classPolicy?.roles && classPolicy.roles.length > 0) {
      roleGroups.push(classPolicy.roles);
    }
    if (methodPolicy?.roles && methodPolicy.roles.length > 0) {
      roleGroups.push(methodPolicy.roles);
    }

    const composed: ComposedRoutePolicy = {
      roleGroups,
      scopes: unique([...(classPolicy?.scopes ?? []), ...(methodPolicy?.scopes ?? [])]),
      tenant: classPolicy?.tenant === true || methodPolicy?.tenant === true,
      ownership: classPolicy?.ownership === true || methodPolicy?.ownership === true,
      handlers: unique([...(classPolicy?.handlers ?? []), ...(methodPolicy?.handlers ?? [])]),
      roleMode,
      scopeMode,
      unsafeSkipObjectCheck:
        classPolicy?.unsafeSkipObjectCheck === true || methodPolicy?.unsafeSkipObjectCheck === true,
      ...(resource !== undefined ? { resource } : {}),
      ...(action !== undefined ? { action } : {}),
    };

    PolicyComposer.assertResourceType(composed);
    PolicyComposer.assertObjectCheck(composed);

    return composed;
  }

  /** Tenant and ownership compare against resource attributes, so they need one. */
  private static assertResourceType(policy: ComposedRoutePolicy): void {
    if ((policy.tenant || policy.ownership) && policy.resource === undefined) {
      throw new MissingResourceTypeError();
    }
  }

  /**
   * A policy that names a resource but checks nothing about it is the BOLA hole
   * this package exists to close, so it fails closed instead of allowing.
   * `action` is descriptive metadata and never counts as a check.
   */
  private static assertObjectCheck(policy: ComposedRoutePolicy): void {
    if (policy.resource === undefined || policy.unsafeSkipObjectCheck) {
      return;
    }

    const checksResource = policy.tenant || policy.ownership || policy.handlers.length > 0;
    if (!checksResource) {
      throw new MissingObjectCheckError(policy.resource);
    }
  }
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}
