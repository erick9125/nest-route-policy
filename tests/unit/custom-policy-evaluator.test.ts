import { describe, expect, it } from 'vitest';
import { CustomPolicyEvaluator } from '../../src/core/evaluation/custom-policy-evaluator.js';
import { PolicyHandlerNotFoundError } from '../../src/errors/policy-handler-not-found.error.js';
import { PolicyHandlerRegistry } from '../../src/registry/policy-handler-registry.js';
import type { PolicyHandler } from '../../src/core/contracts/policy-handler.js';
import type { AuthorizationContext } from '../../src/core/models/authorization-context.js';
import { fakePrincipal } from '../../src/testing/fake-principal.js';

function context(resource: unknown): AuthorizationContext {
  return {
    principal: fakePrincipal(),
    resource,
    params: {},
    query: {},
    request: {},
  };
}

describe('CustomPolicyEvaluator', () => {
  it('allows when every handler allows', async () => {
    const registry = new PolicyHandlerRegistry();
    const handler: PolicyHandler = {
      name: 'invoice.canApprove',
      evaluate: (ctx) => ({ allowed: (ctx.resource as { status: string }).status === 'pending' }),
    };
    registry.register(handler);

    const evaluator = new CustomPolicyEvaluator(registry);
    const violations = await evaluator.evaluate(
      ['invoice.canApprove'],
      context({ status: 'pending' }),
    );
    expect(violations).toEqual([]);
  });

  it('denies when a handler rejects the resource state', async () => {
    const registry = new PolicyHandlerRegistry();
    registry.register({
      name: 'invoice.canApprove',
      evaluate: (ctx) => ({ allowed: (ctx.resource as { status: string }).status === 'pending' }),
    });

    const evaluator = new CustomPolicyEvaluator(registry);
    const violations = await evaluator.evaluate(
      ['invoice.canApprove'],
      context({ status: 'approved' }),
    );
    expect(violations[0]?.type).toBe('CUSTOM_POLICY_DENIED');
  });

  it('fails closed when a handler is not registered', async () => {
    const evaluator = new CustomPolicyEvaluator(new PolicyHandlerRegistry());
    await expect(evaluator.evaluate(['missing.handler'], context({}))).rejects.toBeInstanceOf(
      PolicyHandlerNotFoundError,
    );
  });
});

describe('CustomPolicyEvaluator short-circuit', () => {
  it('does not run the remaining handlers once one denies', async () => {
    const calls: string[] = [];
    const registry = new PolicyHandlerRegistry();
    registry.register({
      name: 'first',
      evaluate: () => {
        calls.push('first');
        return { allowed: false };
      },
    });
    registry.register({
      name: 'second',
      evaluate: () => {
        calls.push('second');
        return { allowed: true };
      },
    });

    const violations = await new CustomPolicyEvaluator(registry).evaluate(
      ['first', 'second'],
      context({}),
    );

    expect(calls).toEqual(['first']);
    expect(violations).toHaveLength(1);
  });

  it('carries the handler reason into the violation message', async () => {
    const registry = new PolicyHandlerRegistry();
    registry.register({
      name: 'invoice.canApprove',
      evaluate: () => ({ allowed: false, reason: 'invoice is not pending' }),
    });

    const violations = await new CustomPolicyEvaluator(registry).evaluate(
      ['invoice.canApprove'],
      context({}),
    );

    expect(violations[0]?.message).toContain('invoice is not pending');
  });

  it('reads well without a reason', async () => {
    const registry = new PolicyHandlerRegistry();
    registry.register({ name: 'plain', evaluate: () => ({ allowed: false }) });

    const violations = await new CustomPolicyEvaluator(registry).evaluate(['plain'], context({}));

    expect(violations[0]?.message).toBe('Custom policy handler "plain" denied the request.');
  });
});
