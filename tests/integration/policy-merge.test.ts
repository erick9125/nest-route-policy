import { afterAll, beforeAll, describe, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createInvoicesApp } from '../fixtures/invoices-app.js';
import { ADMIN_A, INVOICE_A1, INVOICE_A2, USER_A } from '../fixtures/invoices.js';

describe('policy metadata merge', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createInvoicesApp();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('requires the controller scope even when the method policy does not repeat it', async () => {
    await request(app.getHttpServer())
      .get(`/invoices/${INVOICE_A1}`)
      .set('x-user', USER_A)
      .expect(200);
  });

  it('keeps method role requirements in addition to controller scopes', async () => {
    await request(app.getHttpServer())
      .delete(`/invoices/${INVOICE_A2}`)
      .set('x-user', USER_A)
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/invoices/${INVOICE_A2}`)
      .set('x-user', ADMIN_A)
      .expect(200);
  });
});
