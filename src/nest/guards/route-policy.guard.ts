import { Inject, Injectable, Optional } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PolicyComposer } from '../../core/composition/policy-composer.js';
import type { PolicyDefaults } from '../../core/composition/policy-composer.js';
import type { ComposedRoutePolicy } from '../../core/composition/policy-composer.js';
import { PolicyEvaluator } from '../../core/evaluation/policy-evaluator.js';
import type { RoutePolicy } from '../../core/models/route-policy.js';
import { RoutePolicyDeniedException } from '../../errors/route-policy-denied.error.js';
import { AuthorizationContextFactory } from '../context/authorization-context.factory.js';
import {
  ROUTE_POLICY_LOGGER,
  ROUTE_POLICY_METADATA,
  ROUTE_POLICY_OPTIONS,
} from '../constants.js';
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

    const authorizationContext = await this.contextFactory.create(context, policy);
    const result = await this.evaluator.evaluate(policy, authorizationContext);

    if (!result.allowed) {
      this.logger?.warn(
        `authorization denied resource=${policy.resource ?? '-'} action=${policy.action ?? '-'} reason=${result.reason}`,
      );
      throw new RoutePolicyDeniedException(result);
    }

    return true;
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
