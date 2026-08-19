import { beforeEach, describe, expect, it } from 'vitest';
import {
  Controller,
  Get,
  Injectable,
  Module,
  type CanActivate,
  type ExecutionContext,
  type INestApplication,
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

/** Counts resource lookups so a test can assert none happened. */
const lookups = { count: 0 };

/** Swapped per test to stand in for whatever the host's auth guard produced. */
let currentPrincipal: AuthorizationPrincipal | null = null;

@Injectable()
class CountingResolver implements ResourceResolver {
  async resolve(): Promise<unknown> {
    lookups.count += 1;
    return { id: 'doc-1', ownerId: 'user-1', tenantId: 'tenant-a' };
  }
}

@Injectable()
class DocAttributes implements ResourceAttributesResolver {
  resolve(resource: unknown): ResourceAttributes {
    const doc = resource as { ownerId: string; tenantId: string };
    return { ownerId: doc.ownerId, tenantId: doc.tenantId };
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

@Controller('docs')
class DocController {
  @Get(':id')
  @Authorize({
    resource: 'doc',
    action: 'read',
    roles: ['reader'],
    scopes: ['doc:read'],
    tenant: true,
  })
  read(): string {
    return 'doc-body';
  }
}

@Module({
  imports: [
    RoutePolicyModule.forRoot({
      resources: { doc: { resolver: CountingResolver, attributes: DocAttributes } },
    }),
  ],
  controllers: [DocController],
  providers: [
    { provide: APP_GUARD, useClass: SwappablePrincipalGuard },
    { provide: APP_GUARD, useExisting: RoutePolicyGuard },
  ],
})
class DocModule {}

async function get(): Promise<{ status: number }> {
  const moduleRef = await Test.createTestingModule({ imports: [DocModule] }).compile();
  const app: INestApplication = moduleRef.createNestApplication();
  await app.init();
  try {
    const response = await request(app.getHttpServer()).get('/docs/doc-1');
    return { status: response.status };
  } finally {
    await app.close();
  }
}

describe('evaluation order', () => {
  beforeEach(() => {
    lookups.count = 0;
    currentPrincipal = null;
  });

  it('does not load the resource for an unauthenticated request', async () => {
    currentPrincipal = null;

    const { status } = await get();

    expect(status).toBe(403);
    expect(lookups.count).toBe(0);
  });

  it('does not load the resource when the principal lacks the role', async () => {
    currentPrincipal = {
      id: 'user-1',
      roles: [],
      scopes: ['doc:read'],
      tenantId: 'tenant-a',
    };

    const { status } = await get();

    expect(status).toBe(403);
    expect(lookups.count).toBe(0);
  });

  it('does not load the resource when the principal lacks the scope', async () => {
    currentPrincipal = {
      id: 'user-1',
      roles: ['reader'],
      scopes: [],
      tenantId: 'tenant-a',
    };

    const { status } = await get();

    expect(status).toBe(403);
    expect(lookups.count).toBe(0);
  });

  it('loads the resource exactly once when the claims pass', async () => {
    currentPrincipal = {
      id: 'user-1',
      roles: ['reader'],
      scopes: ['doc:read'],
      tenantId: 'tenant-a',
    };

    const { status } = await get();

    expect(status).toBe(200);
    expect(lookups.count).toBe(1);
  });

  it('reaches the resource phase to deny on tenant, after the claims pass', async () => {
    currentPrincipal = {
      id: 'user-1',
      roles: ['reader'],
      scopes: ['doc:read'],
      tenantId: 'tenant-b',
    };

    const { status } = await get();

    expect(status).toBe(403);
    expect(lookups.count).toBe(1);
  });
});
