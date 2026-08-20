import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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
import type { ResourceAttributes } from '../../src/core/models/resource-attributes.js';
import type { ResourceAttributesResolver } from '../../src/core/contracts/resource-attributes-resolver.js';
import type { ResourceResolver } from '../../src/core/contracts/resource-resolver.js';
import { Authorize } from '../../src/nest/decorators/authorize.decorator.js';
import { AuthorizedResource } from '../../src/nest/decorators/authorized-resource.decorator.js';
import { RoutePolicyGuard } from '../../src/nest/guards/route-policy.guard.js';
import { RoutePolicyModule } from '../../src/nest/route-policy.module.js';
import { InvoiceStore, createInvoicesApp } from '../fixtures/invoices-app.js';
import {
  ADMIN_A,
  INVOICE_A1,
  INVOICE_A2,
  INVOICE_B1,
  INVOICE_B2,
  MANAGER_A,
  USER_A,
  USER_B,
} from '../fixtures/invoices.js';

describe('BOLA / ID manipulation', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createInvoicesApp();
  });

  beforeEach(() => {
    app.get(InvoiceStore).reset();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('allows a user to read an invoice in their tenant', async () => {
    await request(app.getHttpServer())
      .get(`/invoices/${INVOICE_A1}`)
      .set('x-user', USER_A)
      .expect(200);
  });

  it('denies a user who swaps the invoice id for another tenant', async () => {
    await request(app.getHttpServer())
      .get(`/invoices/${INVOICE_B1}`)
      .set('x-user', USER_A)
      .expect(403);
  });

  it('denies user B when requesting an invoice from tenant A', async () => {
    await request(app.getHttpServer())
      .get(`/invoices/${INVOICE_A1}`)
      .set('x-user', USER_B)
      .expect(403);
  });

  it('denies updates to an invoice the principal does not own', async () => {
    await request(app.getHttpServer())
      .patch(`/invoices/${INVOICE_A1}`)
      .set('x-user', ADMIN_A)
      .send({ amount: 1 })
      .expect(403);
  });

  it('allows the owner to update their invoice', async () => {
    await request(app.getHttpServer())
      .patch(`/invoices/${INVOICE_A1}`)
      .set('x-user', USER_A)
      .send({ amount: 130 })
      .expect(200);
  });
});

describe('roles, scopes, tenant, ownership, and handlers', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createInvoicesApp();
  });

  beforeEach(() => {
    app.get(InvoiceStore).reset();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('allows admin delete and denies a regular user', async () => {
    await request(app.getHttpServer())
      .delete(`/invoices/${INVOICE_B2}`)
      .set('x-user', USER_B)
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/invoices/${INVOICE_A1}`)
      .set('x-user', ADMIN_A)
      .expect(200);
  });

  it('denies approve without the manager role or approve scope', async () => {
    await request(app.getHttpServer())
      .post(`/invoices/${INVOICE_A2}/approve`)
      .set('x-user', USER_A)
      .expect(403);
  });

  it('allows a manager to approve a pending invoice in the same tenant', async () => {
    await request(app.getHttpServer())
      .post(`/invoices/${INVOICE_A2}/approve`)
      .set('x-user', MANAGER_A)
      .expect(201);
  });

  it('denies approve when the custom handler rejects the invoice status', async () => {
    await request(app.getHttpServer())
      .post(`/invoices/${INVOICE_A1}/approve`)
      .set('x-user', MANAGER_A)
      .expect(403);
  });

  it('denies admin from another tenant even with the admin role', async () => {
    await request(app.getHttpServer())
      .delete(`/invoices/${INVOICE_B1}`)
      .set('x-user', ADMIN_A)
      .expect(403);
  });
});

/**
 * A policy that names a resource and an action but checks nothing about the
 * object used to hand the row over to any authenticated caller. `action` is
 * descriptive metadata, never a check.
 */
describe('a resource policy without an object-level check', () => {
  @Injectable()
  class SecretResolver implements ResourceResolver {
    async resolve(): Promise<unknown> {
      return { id: 'record-1', ownerId: 'someone-else', tenantId: 'tenant-z', secret: 'LEAKED' };
    }
  }

  @Injectable()
  class SecretAttributes implements ResourceAttributesResolver {
    resolve(resource: unknown): ResourceAttributes {
      const record = resource as { ownerId: string; tenantId: string };
      return { ownerId: record.ownerId, tenantId: record.tenantId };
    }
  }

  @Injectable()
  class StrangerGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest<{ user?: unknown }>();
      req.user = { id: 'stranger', tenantId: 'tenant-a', roles: [], scopes: [] };
      return true;
    }
  }

  @Controller('records')
  class RecordController {
    @Get(':id')
    @Authorize({ resource: 'record', action: 'read' })
    read(@AuthorizedResource() record: unknown): unknown {
      return record;
    }
  }

  @Module({
    imports: [
      RoutePolicyModule.forRoot({
        resources: { record: { resolver: SecretResolver, attributes: SecretAttributes } },
      }),
    ],
    controllers: [RecordController],
    providers: [
      { provide: APP_GUARD, useClass: StrangerGuard },
      { provide: APP_GUARD, useExisting: RoutePolicyGuard },
    ],
  })
  class RecordModule {}

  it('fails closed instead of returning another tenant’s record', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [RecordModule] }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();

    try {
      const response = await request(app.getHttpServer()).get('/records/record-1');

      expect(response.status).toBeGreaterThanOrEqual(500);
      expect(response.text).not.toContain('LEAKED');
      expect(response.text).not.toContain('tenant-z');
    } finally {
      await app.close();
    }
  });
});
