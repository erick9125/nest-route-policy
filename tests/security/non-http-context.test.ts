import { describe, expect, it } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PolicyComposer } from '../../src/core/composition/policy-composer.js';
import { PolicyEvaluator } from '../../src/core/evaluation/policy-evaluator.js';
import type { RoutePolicy } from '../../src/core/models/route-policy.js';
import { UnsupportedExecutionContextError } from '../../src/errors/unsupported-execution-context.error.js';
import { ROUTE_POLICY_METADATA } from '../../src/nest/constants.js';
import { AuthorizationContextFactory } from '../../src/nest/context/authorization-context.factory.js';
import { RoutePolicyGuard } from '../../src/nest/guards/route-policy.guard.js';
import { DefaultPrincipalResolver } from '../../src/nest/resolvers/default-principal.resolver.js';
import { PolicyHandlerRegistry } from '../../src/registry/policy-handler-registry.js';
import { ResourceRegistry } from '../../src/registry/resource-registry.js';

/**
 * A transport payload the caller controls. Outside HTTP,
 * `switchToHttp().getRequest()` returns this object, so `user` would otherwise
 * be trusted as an authenticated principal.
 */
const HOSTILE_PAYLOAD = {
  user: { id: 'attacker', roles: ['admin'], scopes: ['invoice:approve'] },
  data: { amount: 1 },
};

function guardFor(
  contextType: string,
  policy: RoutePolicy | undefined,
): { guard: RoutePolicyGuard; context: ExecutionContext } {
  class MessageController {}
  const handler = (): void => {};
  if (policy) {
    Reflect.defineMetadata(ROUTE_POLICY_METADATA, policy, handler);
  }

  const guard = new RoutePolicyGuard(
    new Reflector(),
    new PolicyEvaluator(new PolicyHandlerRegistry()),
    new AuthorizationContextFactory(new DefaultPrincipalResolver(), new ResourceRegistry()),
    {},
  );

  const context = {
    getType: () => contextType,
    getClass: () => MessageController,
    getHandler: () => handler,
    switchToHttp: () => ({ getRequest: () => HOSTILE_PAYLOAD }),
  } as unknown as ExecutionContext;

  return { guard, context };
}

describe('non-HTTP execution contexts', () => {
  for (const contextType of ['rpc', 'ws', 'graphql']) {
    it(`fails closed instead of trusting a ${contextType} payload as the principal`, async () => {
      const { guard, context } = guardFor(contextType, {
        roles: ['admin'],
        scopes: ['invoice:approve'],
      });

      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
        UnsupportedExecutionContextError,
      );
    });
  }

  it('leaves handlers without a policy untouched on other transports', async () => {
    const { guard, context } = guardFor('rpc', undefined);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('reports the offending context type on the error', async () => {
    const { guard, context } = guardFor('rpc', { roles: ['admin'] });

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      contextType: 'rpc',
      name: 'UnsupportedExecutionContextError',
    });
  });

  it('still evaluates the policy on http', async () => {
    const { guard, context } = guardFor('http', { roles: ['admin'] });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('refuses to build a context directly from a non-HTTP context', async () => {
    const factory = new AuthorizationContextFactory(
      new DefaultPrincipalResolver(),
      new ResourceRegistry(),
    );
    const { context } = guardFor('rpc', undefined);
    const policy = PolicyComposer.from({ roles: ['admin'] });

    await expect(factory.create(context, policy)).rejects.toBeInstanceOf(
      UnsupportedExecutionContextError,
    );
  });
});
