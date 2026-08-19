import { describe, expect, it } from 'vitest';
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
import { Authorize } from '../../src/nest/decorators/authorize.decorator.js';
import { AuthorizedResource } from '../../src/nest/decorators/authorized-resource.decorator.js';
import { RoutePolicyGuard } from '../../src/nest/guards/route-policy.guard.js';
import { RoutePolicyModule } from '../../src/nest/route-policy.module.js';

@Injectable()
class StaticPrincipalGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: unknown }>();
    req.user = { id: 'user-1', roles: ['admin'], scopes: [], tenantId: 'tenant-a' };
    return true;
  }
}

@Controller('no-resource')
class NoResourceController {
  @Get()
  @Authorize({ roles: ['admin'] })
  read(@AuthorizedResource() resource: unknown): unknown {
    return { reached: true, resource };
  }
}

@Controller('unguarded')
class UnguardedController {
  @Get()
  read(@AuthorizedResource() resource: unknown): unknown {
    return { reached: true, resource };
  }
}

@Module({
  imports: [RoutePolicyModule.forRoot()],
  controllers: [NoResourceController, UnguardedController],
  providers: [
    { provide: APP_GUARD, useClass: StaticPrincipalGuard },
    { provide: APP_GUARD, useExisting: RoutePolicyGuard },
  ],
})
class ResourceModule {}

async function get(path: string): Promise<{ status: number; text: string }> {
  const moduleRef = await Test.createTestingModule({ imports: [ResourceModule] }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  try {
    const response = await request(app.getHttpServer()).get(path);
    return { status: response.status, text: response.text };
  } finally {
    await app.close();
  }
}

describe('@AuthorizedResource without a resolved resource', () => {
  it('fails instead of handing the route undefined when the policy names no resource', async () => {
    const response = await get('/no-resource');

    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(response.text).not.toContain('reached');
  });

  it('fails on a route the guard never authorized', async () => {
    const response = await get('/unguarded');

    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(response.text).not.toContain('reached');
  });
});
