import { afterAll, beforeAll, describe, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createInvoicesApp } from '../fixtures/invoices-app.js';
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

  afterAll(async () => {
    await app?.close();
  });

  it('allows admin delete and denies a regular user', async () => {
    await request(app.getHttpServer())
      .delete(`/invoices/${INVOICE_B2}`)
      .set('x-user', USER_B)
      .expect(403);
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
