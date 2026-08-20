import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { Authorize, AuthorizedResource } from '@erickmorales91/nest-route-policy/nest';
import type { Invoice } from './invoice.js';
import { InvoiceStore } from './invoice.store.js';

@Controller('invoices')
@Authorize({
  scopes: ['invoice:access'],
})
export class InvoiceController {
  constructor(@Inject(InvoiceStore) private readonly invoices: InvoiceStore) {}

  @Get(':id')
  @Authorize({
    resource: 'invoice',
    action: 'read',
    tenant: true,
  })
  findOne(@AuthorizedResource() invoice: Invoice): Invoice {
    return invoice;
  }

  @Patch(':id')
  @Authorize({
    resource: 'invoice',
    action: 'update',
    ownership: true,
    tenant: true,
  })
  update(
    @Param('id') _id: string,
    @AuthorizedResource() invoice: Invoice,
    @Body() body: { amount?: number },
  ): Invoice | null {
    return this.invoices.update(invoice.id, body.amount ?? invoice.amount);
  }

  @Post(':id/approve')
  @Authorize({
    resource: 'invoice',
    action: 'approve',
    roles: ['manager'],
    scopes: ['invoice:approve'],
    tenant: true,
    handlers: ['invoice.canApprove'],
  })
  approve(@AuthorizedResource() invoice: Invoice): Invoice | null {
    return this.invoices.approve(invoice.id);
  }

  @Delete(':id')
  @Authorize({
    resource: 'invoice',
    action: 'delete',
    roles: ['admin'],
    tenant: true,
  })
  remove(@AuthorizedResource() invoice: Invoice): Invoice | null {
    return this.invoices.remove(invoice.id);
  }
}
