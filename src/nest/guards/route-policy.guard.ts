import { Inject, Injectable, Optional } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PolicyComposer } from '../../core/composition/policy-composer.js';
import type { PolicyDefaults } from '../../core/composition/policy-composer.js';
import type { ComposedRoutePolicy } from '../../core/composition/policy-composer.js';
import { PolicyEvaluator } from '../../core/evaluation/policy-evaluator.js';
import type { AuthorizationResult } from '../../core/models/authorization-result.js';
import type { RoutePolicy } from '../../core/models/route-policy.js';
import { RoutePolicyDeniedException } from '../../errors/route-policy-denied.error.js';
import { AuthorizationContextFactory } from '../context/authorization-context.factory.js';
import { ROUTE_POLICY_LOGGER, ROUTE_POLICY_METADATA, ROUTE_POLICY_OPTIONS } from '../constants.js';
import type { RoutePolicyLogger, RoutePolicyModuleOptions } from '../route-policy.options.js';

@Injectable()
export class RoutePolicyGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(PolicyEvaluator) private readonly evaluator: PolicyEvaluator,
    @Inject(AuthorizationContextFactory)
    private readonly contextFactory: AuthorizationContextFactory,
    @Inject(ROUTE_POLICY_OPTIONS) private readonly options: RoutePolicyModuleOptions,
    @Optional() @Inject(ROUTE_POLICY_LOGGER) private readonly logger?: RoutePolicyLogger,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policy = this.readPolicy(context);
    if (!policy) {
      return true;
    }

    // Throws on non-HTTP contexts, where the transport payload would otherwise
    // pass itself off as the request. See AuthorizationContextFactory.
    const baseContext = await this.contextFactory.createBase(context, policy);
    const principalId = baseContext.principal?.id;

    // Claims first: an unauthenticated or under-privileged caller is rejected
    // before the resource resolver runs, so a denied request costs no I/O and
    // reveals nothing about which ids exist.
    const claims = this.evaluator.evaluateClaims(policy, baseContext);
    if (!claims.allowed) {
      this.deny(policy, claims, principalId);
    }

    const authorizationContext = await this.contextFactory.withResource(policy, baseContext);
    const result = await this.evaluator.evaluateResource(policy, authorizationContext);
    if (!result.allowed) {
      this.deny(policy, result, principalId);
    }

    this.record(policy, result, principalId);
    return true;
  }

  private deny(
    policy: ComposedRoutePolicy,
    result: AuthorizationResult,
    principalId: string | undefined,
  ): never {
    this.logger?.warn(
      `authorization denied principal=${principalId ?? '-'} resource=${policy.resource ?? '-'} action=${policy.action ?? '-'} reason=${result.reason}`,
    );
    this.record(policy, result, principalId);
    throw new RoutePolicyDeniedException(result);
  }

  /** Violation types only — a violation message can quote handler-supplied data. */
  private record(
    policy: ComposedRoutePolicy,
    result: AuthorizationResult,
    principalId: string | undefined,
  ): void {
    this.logger?.decision?.({
      allowed: result.allowed,
      reason: result.reason,
      violations: result.violations.map((violation) => violation.type),
      ...(principalId !== undefined ? { principalId } : {}),
      ...(policy.resource !== undefined ? { resource: policy.resource } : {}),
      ...(policy.action !== undefined ? { action: policy.action } : {}),
    });
  }

  private readPolicy(context: ExecutionContext): ComposedRoutePolicy | null {
    const defaults: PolicyDefaults = {
      ...(this.options.defaults?.roleMode !== undefined
        ? { roleMode: this.options.defaults.roleMode }
        : {}),
      ...(this.options.defaults?.scopeMode !== undefined
        ? { scopeMode: this.options.defaults.scopeMode }
        : {}),
    };

    return PolicyComposer.compose(
      this.reflector.get<RoutePolicy | undefined>(ROUTE_POLICY_METADATA, context.getClass()),
      this.reflector.get<RoutePolicy | undefined>(ROUTE_POLICY_METADATA, context.getHandler()),
      defaults,
    );
  }
}
