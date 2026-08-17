import { describe, expect, it } from 'vitest';
import { PolicyComposer } from '../../src/core/composition/policy-composer.js';
import { PolicyEvaluator } from '../../src/core/evaluation/policy-evaluator.js';
import { PolicyEvaluationException } from '../../src/errors/policy-evaluation.error.js';
import { PolicyHandlerNotFoundError } from '../../src/errors/policy-handler-not-found.error.js';
import { PolicyHandlerRegistry } from '../../src/registry/policy-handler-registry.js';
import type { AuthorizationContext } from '../../src/core/models/authorization-context.js';
import { fakePrincipal } from '../../src/testing/fake-principal.js';
import type { PolicyHandler } from '../../src/core/contracts/policy-handler.js';

function createEvaluator(handlers: PolicyHandler[] = []): PolicyEvaluator {
  const registry = new PolicyHandlerRegistry();
  for (const handler of handlers) {
    registry.register(handler);
  }
  return new PolicyEvaluator(registry);
}

function context(
  overrides: Partial<AuthorizationContext> = {},
): AuthorizationContext {
  return {
    principal: fakePrincipal({
      id: 'user-1',
      roles: ['manager'],
      scopes: ['invoice:read', 'invoice:approve'],
      tenantId: 'tenant-a',
    }),
    resource: { id: 'invoice-1' },
    resourceAttributes: { ownerId: 'user-1', tenantId: 'tenant-a' },
    params: { id: 'invoice-1' },
    query: {},
    request: {},
    ...overrides,
  };
}

describe('PolicyEvaluator', () => {
  it('denies unauthenticated principals', async () => {
    const result = await createEvaluator().evaluate(
      PolicyComposer.from({ roles: ['admin'] }),
      context({ principal: null }),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('unauthenticated');
  });

  it('denies a principal without an id', async () => {
    const result = await createEvaluator().evaluate(
      PolicyComposer.from({ scopes: ['invoice:read'] }),
      context({ principal: { id: '' } }),
    );
    expect(result.reason).toBe('unauthenticated');
  });

  it('denies when the resource is missing', async () => {
    const result = await createEvaluator().evaluate(
      PolicyComposer.from({ resource: 'invoice', tenant: true }),
      context({ resource: null }),
    );
    expect(result.reason).toBe('resource_not_found');
  });

  it('allows a matching role and scope', async () => {
    const result = await createEvaluator().evaluate(
      PolicyComposer.from({ roles: ['admin', 'manager'], scopes: ['invoice:read'] }),
      context(),
    );
    expect(result).toEqual({ allowed: true, reason: 'allowed', violations: [] });
  });

  it('collects independent violations instead of stopping at the first', async () => {
    const result = await createEvaluator().evaluate(
      PolicyComposer.from({
        resource: 'invoice',
        roles: ['admin'],
        scopes: ['invoice:export'],
        tenant: true,
        ownership: true,
      }),
      context({
        principal: fakePrincipal({
          id: 'other',
          roles: ['user'],
          scopes: ['invoice:read'],
          tenantId: 'tenant-b',
        }),
      }),
    );
    expect(result.allowed).toBe(false);
    expect(result.violations.map((violation) => violation.type)).toEqual([
      'MISSING_ROLE',
      'MISSING_SCOPE',
      'TENANT_MISMATCH',
      'OWNERSHIP_MISMATCH',
    ]);
  });

  it('requires every condition in a combined policy', async () => {
    const handler: PolicyHandler = {
      name: 'invoice.canApprove',
      evaluate: (ctx) => ({
        allowed: (ctx.resource as { status?: string }).status === 'pending',
      }),
    };

    const policy = PolicyComposer.from({
      resource: 'invoice',
      roles: ['manager'],
      scopes: ['invoice:approve'],
      tenant: true,
      handlers: ['invoice.canApprove'],
    });

    const allowed = await createEvaluator([handler]).evaluate(
      policy,
      context({ resource: { status: 'pending' } }),
    );
    expect(allowed.allowed).toBe(true);

    const denied = await createEvaluator([handler]).evaluate(
      policy,
      context({ resource: { status: 'approved' } }),
    );
    expect(denied.reason).toBe('custom_policy_denied');
  });

  it('throws when tenant is required without a resource type', async () => {
    await expect(
      createEvaluator().evaluate(PolicyComposer.from({ tenant: true }), context()),
    ).rejects.toBeInstanceOf(PolicyEvaluationException);
  });

  it('throws when a handler is unknown', async () => {
    await expect(
      createEvaluator().evaluate(
        PolicyComposer.from({ handlers: ['missing'] }),
        context(),
      ),
    ).rejects.toBeInstanceOf(PolicyHandlerNotFoundError);
  });

  it('does not convert a handler exception into a deny decision', async () => {
    const handler: PolicyHandler = {
      name: 'broken',
      evaluate: () => {
        throw new Error('database unavailable');
      },
    };

    await expect(
      createEvaluator([handler]).evaluate(PolicyComposer.from({ handlers: ['broken'] }), context()),
    ).rejects.toThrow('database unavailable');
  });
});
