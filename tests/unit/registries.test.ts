import { describe, expect, it } from 'vitest';
import { PolicyEvaluationException } from '../../src/errors/policy-evaluation.error.js';
import { PolicyHandlerNotFoundError } from '../../src/errors/policy-handler-not-found.error.js';
import { ResourceResolverNotFoundError } from '../../src/errors/resource-resolver-not-found.error.js';
import { PolicyHandlerRegistry } from '../../src/registry/policy-handler-registry.js';
import { ResourceRegistry } from '../../src/registry/resource-registry.js';

describe('registries', () => {
  it('rejects duplicate policy handlers', () => {
    const registry = new PolicyHandlerRegistry();
    registry.register({ name: 'invoice.canApprove', evaluate: () => ({ allowed: true }) });
    expect(() =>
      registry.register({ name: 'invoice.canApprove', evaluate: () => ({ allowed: true }) }),
    ).toThrow(PolicyEvaluationException);
  });

  it('returns undefined for an unknown handler', () => {
    expect(new PolicyHandlerRegistry().get('missing')).toBeUndefined();
  });

  it('returns a registered resource and throws when missing', () => {
    const registry = new ResourceRegistry();
    const registration = {
      resolver: { resolve: async () => null },
      attributes: { resolve: () => ({}) },
    };
    registry.register('invoice', registration);
    expect(registry.get('invoice')).toBe(registration);
    expect(registry.get('payment')).toBeUndefined();
    expect(() => registry.require('payment')).toThrow(ResourceResolverNotFoundError);
  });
});

describe('error types', () => {
  it('exposes the missing handler name', () => {
    const error = new PolicyHandlerNotFoundError('invoice.canApprove');
    expect(error.handlerName).toBe('invoice.canApprove');
    expect(error).toBeInstanceOf(PolicyEvaluationException);
  });
});
