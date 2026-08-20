import { describe, expect, it } from 'vitest';
import { PolicyComposer } from '../../src/core/composition/policy-composer.js';
import { MissingObjectCheckError } from '../../src/errors/missing-object-check.error.js';

describe('PolicyComposer', () => {
  it('returns null when neither controller nor method declare a policy', () => {
    expect(PolicyComposer.compose(undefined, undefined)).toBeNull();
  });

  it('keeps a method-only policy', () => {
    const composed = PolicyComposer.compose(undefined, { scopes: ['invoice:read'] });
    expect(composed?.scopes).toEqual(['invoice:read']);
  });

  it('keeps a controller-only policy', () => {
    const composed = PolicyComposer.compose({ scopes: ['invoice:access'] }, undefined);
    expect(composed?.scopes).toEqual(['invoice:access']);
  });

  it('merges scopes from controller and method', () => {
    const composed = PolicyComposer.compose(
      { scopes: ['invoice:access'] },
      { scopes: ['invoice:read'] },
    );
    expect(composed?.scopes).toEqual(['invoice:access', 'invoice:read']);
  });

  it('does not flatten role arrays into a single any-group', () => {
    const composed = PolicyComposer.compose({ roles: ['staff'] }, { roles: ['manager'] });
    expect(composed?.roleGroups).toEqual([['staff'], ['manager']]);
  });

  it('merges handlers without duplicates', () => {
    const composed = PolicyComposer.compose(
      { handlers: ['invoice.canRead'] },
      { handlers: ['invoice.canRead', 'invoice.canApprove'] },
    );
    expect(composed?.handlers).toEqual(['invoice.canRead', 'invoice.canApprove']);
  });

  it('enables tenant or ownership when either layer requests it', () => {
    const composed = PolicyComposer.compose(
      { resource: 'invoice', tenant: true },
      { ownership: true },
    );
    expect(composed?.tenant).toBe(true);
    expect(composed?.ownership).toBe(true);
  });

  it('lets the method override resource and action', () => {
    const composed = PolicyComposer.compose(
      { resource: 'invoice', action: 'read', tenant: true },
      { resource: 'payment', action: 'refund', tenant: true },
    );
    expect(composed?.resource).toBe('payment');
    expect(composed?.action).toBe('refund');
  });

  it('rejects a resource policy that checks nothing about the object', () => {
    expect(() => PolicyComposer.from({ resource: 'invoice', action: 'read' })).toThrow(
      MissingObjectCheckError,
    );
  });

  it('does not accept roles, scopes, or action as an object-level check', () => {
    expect(() =>
      PolicyComposer.from({
        resource: 'invoice',
        action: 'read',
        roles: ['admin'],
        scopes: ['invoice:read'],
      }),
    ).toThrow(MissingObjectCheckError);
  });

  it('accepts tenant, ownership, or a handler as the object-level check', () => {
    expect(PolicyComposer.from({ resource: 'invoice', tenant: true }).tenant).toBe(true);
    expect(PolicyComposer.from({ resource: 'invoice', ownership: true }).ownership).toBe(true);
    expect(
      PolicyComposer.from({ resource: 'invoice', handlers: ['invoice.canRead'] }).handlers,
    ).toEqual(['invoice.canRead']);
  });

  it('accepts a check contributed by the other layer', () => {
    const fromMethod = PolicyComposer.compose({ resource: 'invoice' }, { ownership: true });
    expect(fromMethod?.resource).toBe('invoice');

    const fromClass = PolicyComposer.compose({ tenant: true }, { resource: 'invoice' });
    expect(fromClass?.resource).toBe('invoice');
  });

  it('allows opting out of the object check on purpose', () => {
    const composed = PolicyComposer.from({
      resource: 'invoice',
      roles: ['admin'],
      unsafeSkipObjectCheck: true,
    });
    expect(composed.unsafeSkipObjectCheck).toBe(true);
  });

  it('lets either layer opt out of the object check', () => {
    expect(
      PolicyComposer.compose({ unsafeSkipObjectCheck: true }, { resource: 'invoice' })
        ?.unsafeSkipObjectCheck,
    ).toBe(true);
  });

  it('does not require an object check when no resource is declared', () => {
    const composed = PolicyComposer.from({ roles: ['admin'] });
    expect(composed.resource).toBeUndefined();
    expect(composed.unsafeSkipObjectCheck).toBe(false);
  });

  it('uses defaults for role and scope modes', () => {
    const composed = PolicyComposer.from(
      {},
      {
        roleMode: 'all',
        scopeMode: 'any',
      },
    );
    expect(composed.roleMode).toBe('all');
    expect(composed.scopeMode).toBe('any');
  });
});
