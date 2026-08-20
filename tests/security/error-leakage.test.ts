import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { InvoiceStore, createInvoicesApp } from '../fixtures/invoices-app.js';
import { INVOICE_A1, USER_A } from '../fixtures/invoices.js';
import { RoutePolicyDeniedException } from '../../src/errors/route-policy-denied.error.js';
import type { AuthorizationResult } from '../../src/core/models/authorization-result.js';

describe('secure error responses', () => {
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

  it('returns a generic 403 body without internal reason codes', async () => {
    const response = await request(app.getHttpServer())
      .get('/invoices/invoice-b1')
      .set('x-user', USER_A)
      .expect(403);

    expect(response.body).toEqual({
      statusCode: 403,
      message: 'Forbidden',
      error: 'Forbidden',
    });
    expect(JSON.stringify(response.body)).not.toContain('tenant');
    expect(JSON.stringify(response.body)).not.toContain('TENANT_MISMATCH');
    expect(JSON.stringify(response.body)).not.toContain('tenant-a');
    expect(JSON.stringify(response.body)).not.toContain('tenant-b');
  });

  it('returns 403 for a missing resource instead of 404', async () => {
    const response = await request(app.getHttpServer())
      .get('/invoices/missing-invoice')
      .set('x-user', USER_A)
      .expect(403);

    expect(response.body.message).toBe('Forbidden');
    expect(JSON.stringify(response.body)).not.toContain('RESOURCE_NOT_FOUND');
  });

  it('returns 403 when the principal is missing', async () => {
    await request(app.getHttpServer()).get(`/invoices/${INVOICE_A1}`).expect(403);
  });

  it('does not serialize the internal authorization result on the exception', () => {
    const result: AuthorizationResult = {
      allowed: false,
      reason: 'tenant_mismatch',
      violations: [
        {
          type: 'TENANT_MISMATCH',
          message: 'Principal and resource tenants do not match.',
        },
      ],
    };

    const exception = new RoutePolicyDeniedException(result);
    const serialized = JSON.stringify(exception);
    expect(serialized).not.toContain('tenant_mismatch');
    expect(serialized).not.toContain('TENANT_MISMATCH');
    expect(exception.getResponse()).toEqual({
      statusCode: 403,
      message: 'Forbidden',
      error: 'Forbidden',
    });
    expect(exception.getAuthorizationResult()).toBe(result);
  });
});
