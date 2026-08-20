import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { InvoiceStore, createInvoicesApp } from '../fixtures/invoices-app.js';
import { INVOICE_A1, USER_A } from '../fixtures/invoices.js';

describe('NestJS RoutePolicyGuard', () => {
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

  it('allows routes without a policy', async () => {
    await request(app.getHttpServer()).get('/open').expect(200, 'ok');
  });

  it('allows a principal that satisfies controller and method scopes', async () => {
    const response = await request(app.getHttpServer())
      .get(`/invoices/${INVOICE_A1}`)
      .set('x-user', USER_A)
      .expect(200);

    expect(response.body).toMatchObject({ id: INVOICE_A1 });
  });

  it('returns the resource resolved by the guard from @AuthorizedResource', async () => {
    const response = await request(app.getHttpServer())
      .get(`/invoices/${INVOICE_A1}`)
      .set('x-user', USER_A)
      .expect(200);

    expect(response.body.ownerId).toBe(USER_A);
    expect(response.body.tenantId).toBe('tenant-a');
  });
});
