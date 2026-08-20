import { beforeEach, describe, expect, it } from 'vitest';
import {
  Controller,
  Get,
  Injectable,
  Module,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { AuthorizationPrincipal } from '../../src/core/models/authorization-principal.js';
import type { ResourceAttributes } from '../../src/core/models/resource-attributes.js';
import type { ResourceAttributesResolver } from '../../src/core/contracts/resource-attributes-resolver.js';
import type { ResourceResolver } from '../../src/core/contracts/resource-resolver.js';
import { Authorize } from '../../src/nest/decorators/authorize.decorator.js';
import { RoutePolicyGuard } from '../../src/nest/guards/route-policy.guard.js';
import { RoutePolicyModule } from '../../src/nest/route-policy.module.js';
import type { AuthorizationDecisionEvent } from '../../src/nest/route-policy.options.js';

const events: AuthorizationDecisionEvent[] = [];
const warnings: string[] = [];
let currentPrincipal: AuthorizationPrincipal | null = null;

const logger = {
  warn: (message: string): void => {
    warnings.push(message);
  },
  decision: (event: AuthorizationDecisionEvent): void => {
    events.push(event);
  },
};

@Injectable()
class NoteResolver implements ResourceResolver {
  async resolve(): Promise<unknown> {
    return { id: 'note-1', ownerId: 'user-1', tenantId: 'tenant-a' };
  }
}

@Injectable()
class NoteAttributes implements ResourceAttributesResolver {
  resolve(resource: unknown): ResourceAttributes {
    const note = resource as { ownerId: string; tenantId: string };
    return { ownerId: note.ownerId, tenantId: note.tenantId };
  }
}

@Injectable()
class SwappablePrincipalGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: unknown }>();
    req.user = currentPrincipal;
    return true;
  }
}

@Controller('notes')
class NoteController {
  @Get(':id')
  @Authorize({ resource: 'note', action: 'read', tenant: true })
  read(): string {
    return 'note-body';
  }
}

@Module({
  imports: [
    RoutePolicyModule.forRoot({
      logger,
      resources: { note: { resolver: NoteResolver, attributes: NoteAttributes } },
    }),
  ],
  controllers: [NoteController],
  providers: [
    { provide: APP_GUARD, useClass: SwappablePrincipalGuard },
    { provide: APP_GUARD, useExisting: RoutePolicyGuard },
  ],
})
class NoteModule {}

async function get(): Promise<number> {
  const moduleRef = await Test.createTestingModule({ imports: [NoteModule] }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  try {
    const response = await request(app.getHttpServer()).get('/notes/note-1');
    return response.status;
  } finally {
    await app.close();
  }
}

describe('decision logging', () => {
  beforeEach(() => {
    events.length = 0;
    warnings.length = 0;
  });

  it('reports an allowed decision with the principal and policy', async () => {
    currentPrincipal = { id: 'user-1', roles: [], scopes: [], tenantId: 'tenant-a' };

    expect(await get()).toBe(200);
    expect(events).toEqual([
      {
        allowed: true,
        reason: 'allowed',
        principalId: 'user-1',
        resource: 'note',
        action: 'read',
        violations: [],
      },
    ]);
    expect(warnings).toEqual([]);
  });

  it('reports a denied decision with the violation types', async () => {
    currentPrincipal = { id: 'user-2', roles: [], scopes: [], tenantId: 'tenant-b' };

    expect(await get()).toBe(403);
    expect(events).toEqual([
      {
        allowed: false,
        reason: 'tenant_mismatch',
        principalId: 'user-2',
        resource: 'note',
        action: 'read',
        violations: ['TENANT_MISMATCH'],
      },
    ]);
    expect(warnings[0]).toContain('principal=user-2');
  });

  it('reports an unauthenticated decision without a principal id', async () => {
    currentPrincipal = null;

    expect(await get()).toBe(403);
    expect(events[0]).toEqual({
      allowed: false,
      reason: 'unauthenticated',
      resource: 'note',
      action: 'read',
      violations: ['UNAUTHENTICATED'],
    });
  });

  it('never carries violation messages or resource identifiers', async () => {
    currentPrincipal = { id: 'user-2', roles: [], scopes: [], tenantId: 'tenant-b' };
    await get();

    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain('message');
    expect(serialized).not.toContain('tenant-a');
    expect(serialized).not.toContain('tenant-b');
    expect(serialized).not.toContain('note-1');
  });
});
