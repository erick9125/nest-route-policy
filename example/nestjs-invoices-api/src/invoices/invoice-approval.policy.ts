import { Injectable } from '@nestjs/common';
import type {
  AuthorizationContext,
  AuthorizationDecision,
  PolicyHandler,
} from '@erickmorales/nest-route-policy';
import type { Invoice } from './invoice.js';

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
