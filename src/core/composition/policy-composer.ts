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
}

export class PolicyComposer {
  static from(policy: RoutePolicy, defaults: PolicyDefaults = {}): ComposedRoutePolicy {
    const composed = PolicyComposer.compose(undefined, policy, defaults);
    if (!composed) {
      throw new Error('RoutePolicy composition produced no policy.');
    }
    return composed;
  }

  static compose(
    classPolicy: RoutePolicy | undefined,
    methodPolicy: RoutePolicy | undefined,
    defaults: PolicyDefaults = {},
  ): ComposedRoutePolicy | null {
    if (!classPolicy && !methodPolicy) {
      return null;
    }

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

    return {
      roleGroups,
      scopes: unique([...(classPolicy?.scopes ?? []), ...(methodPolicy?.scopes ?? [])]),
      tenant: classPolicy?.tenant === true || methodPolicy?.tenant === true,
      ownership: classPolicy?.ownership === true || methodPolicy?.ownership === true,
      handlers: unique([...(classPolicy?.handlers ?? []), ...(methodPolicy?.handlers ?? [])]),
      roleMode,
      scopeMode,
      ...(resource !== undefined ? { resource } : {}),
      ...(action !== undefined ? { action } : {}),
    };
  }
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}
