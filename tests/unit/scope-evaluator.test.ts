import { describe, expect, it } from 'vitest';
import { ScopeEvaluator } from '../../src/core/evaluation/scope-evaluator.js';
import { fakePrincipal } from '../../src/testing/fake-principal.js';

describe('ScopeEvaluator', () => {
  const evaluator = new ScopeEvaluator();

  it('allows when no scopes are required', () => {
    expect(evaluator.evaluate([], fakePrincipal(), 'all').allowed).toBe(true);
  });

  it('requires every scope by default (all)', () => {
    const missing = evaluator.evaluate(
      ['invoice:read', 'invoice:export'],
      fakePrincipal({ scopes: ['invoice:read'] }),
      'all',
    );
    expect(missing.allowed).toBe(false);
    expect(missing.violation?.type).toBe('MISSING_SCOPE');

    const complete = evaluator.evaluate(
      ['invoice:read', 'invoice:export'],
      fakePrincipal({ scopes: ['invoice:read', 'invoice:export'] }),
      'all',
    );
    expect(complete.allowed).toBe(true);
  });

  it('allows any matching scope when mode is any', () => {
    const result = evaluator.evaluate(
      ['invoice:read', 'invoice:export'],
      fakePrincipal({ scopes: ['invoice:export'] }),
      'any',
    );
    expect(result.allowed).toBe(true);
  });

  it('denies when the principal has a different scope', () => {
    const result = evaluator.evaluate(
      ['invoice:read'],
      fakePrincipal({ scopes: ['invoice:list'] }),
      'all',
    );
    expect(result.allowed).toBe(false);
  });
});
