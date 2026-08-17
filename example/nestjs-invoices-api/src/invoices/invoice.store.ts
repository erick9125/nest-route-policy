import { Injectable } from '@nestjs/common';
import type { Invoice } from './invoice.js';

@Injectable()
export class InvoiceStore {
  private readonly invoices = new Map<string, Invoice>([
    [
      'invoice-a',
      {
        id: 'invoice-a',
        tenantId: 'tenant-a',
        ownerId: 'user-a',
        status: 'pending',
        amount: 120,
      },
    ],
    [
      'invoice-b',
      {
        id: 'invoice-b',
        tenantId: 'tenant-b',
        ownerId: 'user-b',
        status: 'pending',
        amount: 90,
      },
    ],
  ]);

  findById(id: string | undefined): Invoice | null {
    if (!id) {
      return null;
    }
    return this.invoices.get(id) ?? null;
  }

  update(id: string, amount: number): Invoice | null {
    const current = this.findById(id);
    if (!current) {
      return null;
    }
    const next = { ...current, amount };
    this.invoices.set(id, next);
    return next;
  }

  approve(id: string): Invoice | null {
    const current = this.findById(id);
    if (!current) {
      return null;
    }
    const next = { ...current, status: 'approved' as const };
    this.invoices.set(id, next);
    return next;
  }

  remove(id: string): Invoice | null {
    const current = this.findById(id);
    if (!current) {
      return null;
    }
    this.invoices.delete(id);
    return current;
  }
}
