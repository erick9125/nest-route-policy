import {
  Body,
  Controller,
  Delete,
  Get,
  Global,
  Inject,
  Injectable,
  Module,
  Param,
  Patch,
  Post,
  type CanActivate,
  type ExecutionContext,
  type INestApplication,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { AuthorizationContext } from '../../src/core/models/authorization-context.js';
import type { AuthorizationDecision } from '../../src/core/models/authorization-decision.js';
import type { PolicyHandler } from '../../src/core/contracts/policy-handler.js';
import type { ResourceAttributes } from '../../src/core/models/resource-attributes.js';
import type { ResourceAttributesResolver } from '../../src/core/contracts/resource-attributes-resolver.js';
import type { ResourceResolver } from '../../src/core/contracts/resource-resolver.js';
import { Authorize } from '../../src/nest/decorators/authorize.decorator.js';
import { AuthorizedResource } from '../../src/nest/decorators/authorized-resource.decorator.js';
import { RoutePolicyModule } from '../../src/nest/route-policy.module.js';
import { RoutePolicyGuard } from '../../src/nest/guards/route-policy.guard.js';
import {
  type Invoice,
  createInvoiceStore,
} from './invoices.js';
import { principalById } from './principals.js';

@Injectable()
export class InvoiceStore {
  private readonly invoices = createInvoiceStore();

  findById(id: string | undefined): Invoice | null {
    if (!id) {
      return null;
    }
    return this.invoices.get(id) ?? null;
  }

  update(id: string, patch: Partial<Pick<Invoice, 'amount' | 'status'>>): Invoice | null {
    const current = this.findById(id);
    if (!current) {
      return null;
    }
    const next = { ...current, ...patch };
    this.invoices.set(id, next);
    return next;
  }

  approve(id: string): Invoice | null {
    return this.update(id, { status: 'approved' });
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

@Injectable()
export class InvoiceResourceResolver implements ResourceResolver<Invoice> {
  constructor(@Inject(InvoiceStore) private readonly invoices: InvoiceStore) {}

  async resolve(context: AuthorizationContext): Promise<Invoice | null> {
    return this.invoices.findById(context.params['id']);
  }
}

@Injectable()
export class InvoiceAttributesResolver implements ResourceAttributesResolver<Invoice> {
  resolve(invoice: Invoice): ResourceAttributes {
    return {
      ownerId: invoice.ownerId,
      tenantId: invoice.tenantId,
    };
  }
}

@Injectable()
export class InvoiceApprovalPolicy implements PolicyHandler {
  readonly name = 'invoice.canApprove';

  evaluate(context: AuthorizationContext): AuthorizationDecision {
    const invoice = context.resource as Invoice | undefined;
    return {
      allowed: invoice?.status === 'pending',
    };
  }
}

@Injectable()
class HeaderPrincipalGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: unknown;
    }>();
    const header = request.headers['x-user'];
    const userId = Array.isArray(header) ? header[0] : header;
    request.user = principalById(userId);
    return true;
  }
}

@Controller('invoices')
@Authorize({
  scopes: ['invoice:access'],
})
class InvoiceController {
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
    @AuthorizedResource() invoice: Invoice,
    @Body() body: { amount?: number },
  ): Invoice | null {
    return this.invoices.update(invoice.id, body);
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
  remove(@Param('id') _id: string, @AuthorizedResource() invoice: Invoice): Invoice | null {
    return this.invoices.remove(invoice.id);
  }
}

@Controller('open')
class OpenController {
  @Get()
  ping(): string {
    return 'ok';
  }
}

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
  controllers: [InvoiceController, OpenController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: HeaderPrincipalGuard,
    },
    {
      provide: APP_GUARD,
      useExisting: RoutePolicyGuard,
    },
  ],
})
export class InvoicesTestModule {}

export async function createInvoicesApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [InvoicesTestModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}
