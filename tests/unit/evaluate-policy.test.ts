import { describe, expect, it } from 'vitest';
import { evaluatePolicy } from '../../src/testing/authorization-test-builder.js';
import { fakePrincipal } from '../../src/testing/fake-principal.js';

describe('evaluatePolicy', () => {
  it('allows a principal that has the required scope', async () => {
    const result = await evaluatePolicy({
      policy: { scopes: ['invoice:read'] },
      principal: fakePrincipal({ scopes: ['invoice:read'] }),
    });
    expect(result.allowed).toBe(true);
  });

  it('denies a principal that lacks the required scope', async () => {
    const result = await evaluatePolicy({
      policy: { scopes: ['invoice:read'] },
      principal: fakePrincipal({ scopes: ['invoice:list'] }),
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('missing_scope');
  });
});
