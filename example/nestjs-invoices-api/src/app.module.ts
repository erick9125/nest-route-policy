import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RoutePolicyModule, RoutePolicyGuard } from '@erickmorales91/nest-route-policy/nest';
import { DemoAuthGuard } from './auth/demo-auth.guard.js';
import { InvoiceApprovalPolicy } from './invoices/invoice-approval.policy.js';
import { InvoiceAttributesResolver } from './invoices/invoice.attributes-resolver.js';
import { InvoiceController } from './invoices/invoice.controller.js';
import { InvoiceResourceResolver } from './invoices/invoice.resource-resolver.js';
import { InvoiceStore } from './invoices/invoice.store.js';

@Global()
@Module({
  providers: [InvoiceStore],
  exports: [InvoiceStore],
})
class InvoiceStoreModule {}

@Module({
  imports: [
    InvoiceStoreModule,
    RoutePolicyModule.forRoot({
      imports: [InvoiceStoreModule],
      defaults: {
        roleMode: 'any',
        scopeMode: 'all',
      },
      resources: {
        invoice: {
          resolver: InvoiceResourceResolver,
          attributes: InvoiceAttributesResolver,
        },
      },
      policies: [InvoiceApprovalPolicy],
    }),
  ],
  controllers: [InvoiceController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: DemoAuthGuard,
    },
    {
      provide: APP_GUARD,
      useExisting: RoutePolicyGuard,
    },
  ],
})
export class AppModule {}
