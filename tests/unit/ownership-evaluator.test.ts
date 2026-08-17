import { describe, expect, it } from 'vitest';
import { OwnershipEvaluator } from '../../src/core/evaluation/ownership-evaluator.js';
import { fakePrincipal } from '../../src/testing/fake-principal.js';

describe('OwnershipEvaluator', () => {
  const evaluator = new OwnershipEvaluator();

  it('allows when the principal owns the resource', () => {
    const result = evaluator.evaluate(fakePrincipal({ id: '10' }), { ownerId: '10' });
    expect(result.allowed).toBe(true);
  });

  it('denies when the owner is different', () => {
    const result = evaluator.evaluate(fakePrincipal({ id: '10' }), { ownerId: '20' });
    expect(result.allowed).toBe(false);
    expect(result.violation?.type).toBe('OWNERSHIP_MISMATCH');
  });

  it('denies when the resource has no owner', () => {
    const result = evaluator.evaluate(fakePrincipal({ id: '10' }), {});
    expect(result.allowed).toBe(false);
  });
});
