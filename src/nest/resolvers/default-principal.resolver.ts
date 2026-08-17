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

function toPrincipal(value: unknown): AuthorizationPrincipal | null {
  if (value === null || value === undefined || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string' || record.id.length === 0) {
    return null;
  }

  if (hasInvalidOptional(record, 'roles', isStringArray)) {
    return null;
  }
  if (hasInvalidOptional(record, 'scopes', isStringArray)) {
    return null;
  }
  if (hasInvalidOptional(record, 'tenantId', isOptionalString)) {
    return null;
  }
  if (hasInvalidOptional(record, 'attributes', isAttributeRecord)) {
    return null;
  }

  return {
    id: record.id,
    ...(isStringArray(record.roles) ? { roles: record.roles } : {}),
    ...(isStringArray(record.scopes) ? { scopes: record.scopes } : {}),
    ...(typeof record.tenantId === 'string' ? { tenantId: record.tenantId } : {}),
    ...(isAttributeRecord(record.attributes) ? { attributes: record.attributes } : {}),
  };
}

function hasInvalidOptional(
  record: Record<string, unknown>,
  key: string,
  guard: (value: unknown) => boolean,
): boolean {
  return key in record && record[key] !== undefined && !guard(record[key]);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isOptionalString(value: unknown): value is string {
  return typeof value === 'string';
}

function isAttributeRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
