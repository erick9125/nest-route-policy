import { describe, expect, it } from 'vitest';
import { RoleEvaluator } from '../../src/core/evaluation/role-evaluator.js';
import { fakePrincipal } from '../../src/testing/fake-principal.js';

describe('RoleEvaluator', () => {
  const evaluator = new RoleEvaluator();

  it('allows when no roles are required', () => {
    const result = evaluator.evaluate([], fakePrincipal(), 'any');
    expect(result.allowed).toBe(true);
  });

  it('allows when the principal has any required role', () => {
    const result = evaluator.evaluate(
      [['admin', 'manager']],
      fakePrincipal({ roles: ['manager'] }),
      'any',
    );
    expect(result.allowed).toBe(true);
  });

  it('denies when the principal has none of the required roles', () => {
    const result = evaluator.evaluate(
      [['admin', 'manager']],
      fakePrincipal({ roles: ['user'] }),
      'any',
    );
    expect(result.allowed).toBe(false);
    expect(result.violation?.type).toBe('MISSING_ROLE');
  });

  it('requires every role when mode is all', () => {
    const missing = evaluator.evaluate(
      [['admin', 'manager']],
      fakePrincipal({ roles: ['admin'] }),
      'all',
    );
    expect(missing.allowed).toBe(false);

    const complete = evaluator.evaluate(
      [['admin', 'manager']],
      fakePrincipal({ roles: ['admin', 'manager'] }),
      'all',
    );
    expect(complete.allowed).toBe(true);
  });

  it('requires every role group to pass', () => {
    const result = evaluator.evaluate(
      [['staff'], ['manager']],
      fakePrincipal({ roles: ['staff'] }),
      'any',
    );
    expect(result.allowed).toBe(false);
  });
});
