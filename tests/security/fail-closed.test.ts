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
import { describe, expect, it } from 'vitest';
import type { ResourceAttributesResolver } from '../../src/core/contracts/resource-attributes-resolver.js';
import type { ResourceResolver } from '../../src/core/contracts/resource-resolver.js';
import { PolicyHandlerNotFoundError } from '../../src/errors/policy-handler-not-found.error.js';
import { ResourceResolverNotFoundError } from '../../src/errors/resource-resolver-not-found.error.js';
import { Authorize } from '../../src/nest/decorators/authorize.decorator.js';
import { RoutePolicyGuard } from '../../src/nest/guards/route-policy.guard.js';
import { RoutePolicyModule } from '../../src/nest/route-policy.module.js';

@Injectable()
class ExplodingResolver implements ResourceResolver {
  async resolve(): Promise<unknown> {
    throw new Error('database unavailable');
  }
}

@Injectable()
class EmptyAttributes implements ResourceAttributesResolver {
  resolve(): { ownerId?: string } {
    return {};
  }
}

@Injectable()
class StaticPrincipalGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: unknown }>();
    request.user = {
      id: 'user-1',
      roles: ['admin'],
      scopes: ['invoice:access'],
      tenantId: 'tenant-a',
    };
    return true;
  }
}

@Controller('broken-resource')
class UnknownResourceController {
  @Get(':id')
  @Authorize({ resource: 'unknown', action: 'read', tenant: true })
  read(): string {
    return 'should-not-run';
  }
}

@Controller('missing-handler')
class MissingHandlerController {
  @Get()
  @Authorize({ handlers: ['does.not.exist'] })
  run(): string {
    return 'should-not-run';
  }
}

@Controller('exploding')
class ExplodingController {
  @Get(':id')
  @Authorize({ resource: 'invoice', action: 'read', tenant: true })
  read(): string {
    return 'should-not-run';
  }
}

async function httpGet(module: new (...args: never[]) => unknown, path: string) {
  const moduleRef = await Test.createTestingModule({ imports: [module] }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  try {
    return await request(app.getHttpServer()).get(path);
  } finally {
    await app.close();
  }
}

describe('fail-closed behavior', () => {
  it('does not allow access when the resource type is not registered', async () => {
    @Module({
      imports: [RoutePolicyModule.forRoot()],
      controllers: [UnknownResourceController],
      providers: [
        { provide: APP_GUARD, useClass: StaticPrincipalGuard },
        { provide: APP_GUARD, useExisting: RoutePolicyGuard },
      ],
    })
    class TestModule {}

    const response = await httpGet(TestModule, '/broken-resource/1');
    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(response.text).not.toContain('should-not-run');
  });

  it('does not allow access when a policy handler is missing', async () => {
    @Module({
      imports: [RoutePolicyModule.forRoot()],
      controllers: [MissingHandlerController],
      providers: [
        { provide: APP_GUARD, useClass: StaticPrincipalGuard },
        { provide: APP_GUARD, useExisting: RoutePolicyGuard },
      ],
    })
    class TestModule {}

    const response = await httpGet(TestModule, '/missing-handler');
    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(response.text).not.toContain('should-not-run');
  });

  it('does not allow access when the resolver throws', async () => {
    @Module({
      imports: [
        RoutePolicyModule.forRoot({
          resources: {
            invoice: {
              resolver: ExplodingResolver,
              attributes: EmptyAttributes,
            },
          },
        }),
      ],
      controllers: [ExplodingController],
      providers: [
        { provide: APP_GUARD, useClass: StaticPrincipalGuard },
        { provide: APP_GUARD, useExisting: RoutePolicyGuard },
      ],
    })
    class TestModule {}

    const response = await httpGet(TestModule, '/exploding/1');
    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(response.status).not.toBe(403);
  });
});

describe('fail-closed error types', () => {
  it('keeps missing handler and missing resolver as evaluation errors', () => {
    expect(new PolicyHandlerNotFoundError('x')).toBeInstanceOf(Error);
    expect(new ResourceResolverNotFoundError('invoice')).toBeInstanceOf(Error);
  });
});
