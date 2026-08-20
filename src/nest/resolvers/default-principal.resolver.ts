import { Injectable } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { AuthorizationPrincipal } from '../../core/models/authorization-principal.js';
import type { PrincipalResolver } from './principal-resolver.js';

@Injectable()
export class DefaultPrincipalResolver implements PrincipalResolver {
  resolve(context: ExecutionContext): AuthorizationPrincipal | null {
    const request = context.switchToHttp().getRequest<HttpRequestLike>();
    return toPrincipal(request.user);
  }
}

interface HttpRequestLike {
  readonly user?: unknown;
}

/**
 * Reads `request.user` into a principal, or returns `null` when it does not
 * match the shape. A malformed principal is not an authenticated one, so every
 * rejection here becomes a deny rather than a partially trusted principal.
 */
function toPrincipal(value: unknown): AuthorizationPrincipal | null {
  if (value === null || value === undefined || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string' || record.id.length === 0) {
    return null;
  }

  const roles = readOptional(record, 'roles', isStringArray);
  const scopes = readOptional(record, 'scopes', isStringArray);
  const tenantId = readOptional(record, 'tenantId', isString);
  const attributes = readOptional(record, 'attributes', isAttributeRecord);

  if (!roles.valid || !scopes.valid || !tenantId.valid || !attributes.valid) {
    return null;
  }

  return {
    id: record.id,
    ...(roles.value !== undefined ? { roles: roles.value } : {}),
    ...(scopes.value !== undefined ? { scopes: scopes.value } : {}),
    ...(tenantId.value !== undefined ? { tenantId: tenantId.value } : {}),
    ...(attributes.value !== undefined ? { attributes: attributes.value } : {}),
  };
}

interface OptionalField<T> {
  readonly valid: boolean;
  readonly value?: T;
}

/** Absent is fine, present-and-wrong is not. Reads each field exactly once. */
function readOptional<T>(
  record: Record<string, unknown>,
  key: string,
  guard: (value: unknown) => value is T,
): OptionalField<T> {
  const value = record[key];
  if (value === undefined) {
    return { valid: true };
  }

  return guard(value) ? { valid: true, value } : { valid: false };
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isAttributeRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
