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

describe('OwnershipEvaluator edge cases', () => {
  it('denies when the owner id is an empty string', () => {
    const result = new OwnershipEvaluator().evaluate(fakePrincipal({ id: '10' }), { ownerId: '' });
    expect(result.allowed).toBe(false);
    expect(result.violation?.type).toBe('OWNERSHIP_MISMATCH');
  });

  it('denies when there are no resource attributes at all', () => {
    const result = new OwnershipEvaluator().evaluate(fakePrincipal({ id: '10' }), undefined);
    expect(result.allowed).toBe(false);
  });
});
