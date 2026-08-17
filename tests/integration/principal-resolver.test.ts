import { describe, expect, it } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { DefaultPrincipalResolver } from '../../src/nest/resolvers/default-principal.resolver.js';

function httpContext(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as ExecutionContext;
}

describe('DefaultPrincipalResolver', () => {
  const resolver = new DefaultPrincipalResolver();

  it('reads request.user when it matches AuthorizationPrincipal', () => {
    const principal = resolver.resolve(
      httpContext({
        id: 'user-1',
        roles: ['admin'],
        scopes: ['invoice:read'],
        tenantId: 'tenant-a',
        attributes: { department: 'finance' },
      }),
    );

    expect(principal).toEqual({
      id: 'user-1',
      roles: ['admin'],
      scopes: ['invoice:read'],
      tenantId: 'tenant-a',
      attributes: { department: 'finance' },
    });
  });

  it('returns null when request.user is missing', () => {
    expect(resolver.resolve(httpContext(undefined))).toBeNull();
  });

  it('returns null for a malformed principal', () => {
    expect(resolver.resolve(httpContext({ roles: ['admin'] }))).toBeNull();
    expect(resolver.resolve(httpContext({ id: 12 }))).toBeNull();
    expect(resolver.resolve(httpContext({ id: 'user-1', roles: 'admin' }))).toBeNull();
  });
});
