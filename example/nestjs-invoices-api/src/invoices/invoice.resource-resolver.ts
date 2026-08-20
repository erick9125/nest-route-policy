import { Inject, Injectable } from '@nestjs/common';
import type { AuthorizationContext, ResourceResolver } from '@erickmorales91/nest-route-policy';
import { InvoiceStore } from './invoice.store.js';
import type { Invoice } from './invoice.js';

@Injectable()
export class InvoiceResourceResolver implements ResourceResolver<Invoice> {
  constructor(@Inject(InvoiceStore) private readonly invoices: InvoiceStore) {}

  async resolve(context: AuthorizationContext): Promise<Invoice | null> {
    return this.invoices.findById(context.params['id']);
  }
}
