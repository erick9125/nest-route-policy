import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';

const USERS = {
  'user-a': {
    id: 'user-a',
    tenantId: 'tenant-a',
    roles: [],
    scopes: ['invoice:access', 'invoice:read'],
  },
  'user-b': {
    id: 'user-b',
    tenantId: 'tenant-b',
    roles: [],
    scopes: ['invoice:access', 'invoice:read'],
  },
  'manager-a': {
    id: 'manager-a',
    tenantId: 'tenant-a',
    roles: ['manager'],
    scopes: ['invoice:access', 'invoice:read', 'invoice:approve'],
  },
  'admin-a': {
    id: 'admin-a',
    tenantId: 'tenant-a',
    roles: ['admin'],
    scopes: ['invoice:access', 'invoice:read'],
  },
} as const;

@Injectable()
export class DemoAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: unknown;
    }>();
    const header = request.headers['x-user'];
    const userId = Array.isArray(header) ? header[0] : header;
    request.user = userId && userId in USERS ? USERS[userId as keyof typeof USERS] : null;
    return true;
  }
}
