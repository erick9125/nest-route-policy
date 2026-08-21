# Custom policies

Custom handlers are TypeScript classes. There is no policy DSL in `0.1.x`.

```ts
@Injectable()
export class InvoiceApprovalPolicy implements PolicyHandler {
  readonly name = 'invoice.canApprove';

  evaluate(context: AuthorizationContext): AuthorizationDecision {
    const invoice = context.resource as Invoice;
    return { allowed: invoice.status === 'pending' };
  }
}
```

Register the class in `RoutePolicyModule.forRoot({ policies: [...] })` and
reference it by `name` in `@Authorize({ handlers: ['invoice.canApprove'] })`.

Handlers run after principal, role, scope, tenant, and ownership checks. All
handlers must allow. A missing name throws `PolicyHandlerNotFoundError`.
A thrown handler is an infrastructure error, not a deny.

This is the extension point for richer ABAC, and later for adapters such as
OPA, without changing `@Authorize()`.
