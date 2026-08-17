import { Injectable } from '@nestjs/common';
import type {
  ResourceAttributes,
  ResourceAttributesResolver,
} from '@erickmorales/nest-route-policy';
import type { Invoice } from './invoice.js';

@Injectable()
export class InvoiceAttributesResolver implements ResourceAttributesResolver<Invoice> {
  resolve(invoice: Invoice): ResourceAttributes {
    return {
      ownerId: invoice.ownerId,
      tenantId: invoice.tenantId,
    };
  }
}
