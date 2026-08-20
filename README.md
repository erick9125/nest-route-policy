# Nest Route Policy

Declarative resource-level authorization for NestJS.

Nest Route Policy helps protect API resources using roles, scopes,
ownership, tenant boundaries, and custom contextual policies without
coupling authorization logic to controllers or authentication providers.

**`0.1.0` promise:** define declarative authorization requirements on NestJS
routes and evaluate them against the authenticated principal, resource,
ownership, tenant, roles, scopes, and custom policy handlers.

|         |                                      |
| ------- | ------------------------------------ |
| Package | `@erickmorales/nest-route-policy`    |
| Runtime | NestJS HTTP applications, TypeScript |
| License | MIT                                  |

A Spanish-language summary is available in [README.es.md](README.es.md); this file is the full reference.

---

## Table of contents

1. [The problem](#the-problem)
2. [What this library solves](#what-this-library-solves)
3. [What this is not](#what-this-is-not)
4. [Authentication vs authorization](#authentication-vs-authorization)
5. [Installation](#installation)
6. [Quick start](#quick-start)
7. [Roles](#roles)
8. [Scopes](#scopes)
9. [Ownership](#ownership)
10. [Multi-tenancy](#multi-tenancy)
11. [Resource resolvers](#resource-resolvers)
12. [Custom policies](#custom-policies)
13. [`@AuthorizedResource`](#authorizedresource)
14. [Policy composition](#policy-composition)
15. [Security model](#security-model)
16. [Error behavior](#error-behavior)
17. [Testing](#testing)
18. [Architecture](#architecture)
19. [Limitations and roadmap](#limitations-and-roadmap)
20. [License](#license)

---

## The problem

A typical NestJS handler looks like this:

```ts
@Get(':id')
@UseGuards(JwtAuthGuard)
findOne(@Param('id') id: string) {
  return this.service.findById(id);
}
```

That answers one question:

> Is the caller authenticated?

It does not answer:

> May this caller read **this** invoice?

`GET /invoices/100` can succeed for a user who has `invoice:read` even when
invoice `100` belongs to another tenant or another owner. That is the class of
bug OWASP describes as BOLA / IDOR: the endpoint is authorized, the object is
not.

---

## What this library solves

The library evaluates:

```
authenticated principal
        +
requested action
        +
resource
        +
ownership
        +
tenant
        +
roles
        +
scopes
        +
custom context
        ↓
     ALLOW / DENY
```

Version `0.1.0` covers:

- `@Authorize()` on controllers and methods
- a NestJS `RoutePolicyGuard`
- roles (any by default)
- scopes (all by default)
- ownership
- tenant matching
- resource resolvers and attribute resolvers
- custom policy handlers
- deny by default when a policy is present
- structured internal results with generic HTTP 403 bodies
- `@AuthorizedResource()` so the guard and the controller share one load
- a Nest-free evaluator that can be unit-tested in isolation

It helps enforce consistent object-level authorization policies. It does not
prevent every BOLA vulnerability: a missing decorator or a wrong resolver can
still leave a hole.

---

## What this is not

This package is not an IAM.

It does not issue JWTs, log users in, talk to OAuth, store roles in a database,
compile a policy language, or replace Passport. Authentication must happen
before `RoutePolicyGuard` runs.

`0.1.0` does not include GraphQL, WebSockets, microservices, Casbin, OPA,
Zanzibar, Redis, audit dashboards, or `forRootAsync`.

---

## Authentication vs authorization

```
JwtAuthGuard (your app)
      ↓
request.user
      ↓
RoutePolicyGuard (this library)
      ↓
ALLOW / DENY
```

This package does not authenticate users. Authentication must happen before
`RoutePolicyGuard` executes. The library evaluates authorization using the
principal made available by the host application.

Authorization failures are denied by default.

---

## Installation

```bash
npm install @erickmorales/nest-route-policy
```

Peer dependencies, already present in a NestJS app:

- `@nestjs/common` / `@nestjs/core`
- `reflect-metadata`
- `rxjs`

The core evaluator lives on the package root and does not load NestJS. Guards,
decorators, and the module are imported from `@erickmorales/nest-route-policy/nest`.

`0.1.0` is tested with NestJS 11 on Node 20 and 22, HTTP / Express.

---

## Quick start

Map your authenticated user to this shape on `request.user`:

```ts
interface AuthorizationPrincipal {
  id: string;
  roles?: readonly string[];
  scopes?: readonly string[];
  tenantId?: string;
  attributes?: Readonly<Record<string, unknown>>;
}
```

Register the module and a global guard:

```ts
import { APP_GUARD } from '@nestjs/core';
import { RoutePolicyModule, RoutePolicyGuard } from '@erickmorales/nest-route-policy/nest';

@Module({
  imports: [
    RoutePolicyModule.forRoot({
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
  providers: [
    // Order matters. Your authentication guard runs first and populates
    // request.user; RoutePolicyGuard reads it. Registered the other way round,
    // every protected route denies with 403.
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useExisting: RoutePolicyGuard,
    },
  ],
})
export class AppModule {}
```

Declare what a route requires:

```ts
@Get(':id')
@Authorize({
  resource: 'invoice',
  action: 'read',
  tenant: true,
})
findOne(@AuthorizedResource() invoice: Invoice) {
  return invoice;
}
```

Routes without `@Authorize()` are left untouched. Routes with a policy are
denied unless every requirement passes.

### Custom principal resolver

By default the guard reads `request.user` and accepts it only if it already
matches `AuthorizationPrincipal`. Anything else — a different shape, a JWT
payload with other field names — resolves to `null`, which is a deny.

Map your own shape with `principalResolver`:

```ts
@Injectable()
export class JwtPrincipalResolver implements PrincipalResolver {
  resolve(context: ExecutionContext): AuthorizationPrincipal | null {
    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      return null;
    }

    return {
      id: user.sub,
      roles: user.realm_access?.roles ?? [],
      scopes: user.scope?.split(' ') ?? [],
      tenantId: user.org_id,
    };
  }
}

RoutePolicyModule.forRoot({
  principalResolver: JwtPrincipalResolver,
});
```

The resolver is a normal provider, so `imports` applies if it has dependencies.
Returning `null` denies rather than throwing: a malformed principal is not an
authenticated one.

---

## Roles

```ts
@Get()
@Authorize({
  roles: ['admin', 'manager'],
})
findAll() {}
```

Default semantics: **any** of the listed roles. Configurable with `roleMode`:
`'any'` or `'all'`.

---

## Scopes

```ts
@Get()
@Authorize({
  scopes: ['invoice:read', 'invoice:export'],
})
findAll() {}
```

Default semantics: **all** listed scopes. Configurable with `scopeMode`.

Roles and scopes together are combined with AND:

```ts
@Authorize({
  roles: ['admin', 'manager'],
  scopes: ['invoice:read'],
})
```

means `(admin OR manager) AND invoice:read`.

---

## Ownership

```ts
@Get(':id')
@Authorize({
  resource: 'invoice',
  action: 'read',
  ownership: true,
})
findOne() {}
```

The principal's `id` must equal the resource's `ownerId` as returned by the
attribute resolver. The library never assumes a field named `ownerId` on the
domain object itself.

---

## Multi-tenancy

```ts
@Authorize({
  resource: 'invoice',
  action: 'read',
  tenant: true,
})
```

The principal's `tenantId` must equal the resource's `tenantId` from the
attribute resolver. Missing tenant information fails closed (deny).

---

## Resource resolvers

The guard will not guess how to load a row. Register a resolver per resource
type:

```ts
@Injectable()
export class InvoiceResourceResolver implements ResourceResolver<Invoice> {
  constructor(private readonly invoices: InvoiceRepository) {}

  async resolve(context: AuthorizationContext): Promise<Invoice | null> {
    return this.invoices.findById(context.params['id']);
  }
}

@Injectable()
export class InvoiceAttributesResolver implements ResourceAttributesResolver<Invoice> {
  resolve(invoice: Invoice): ResourceAttributes {
    return {
      ownerId: invoice.userId,
      tenantId: invoice.organizationId,
    };
  }
}
```

If the resolver depends on application providers, pass those modules through
`imports` so Nest can inject them:

```ts
RoutePolicyModule.forRoot({
  imports: [InvoicesModule],
  resources: {
    invoice: {
      resolver: InvoiceResourceResolver,
      attributes: InvoiceAttributesResolver,
    },
  },
});
```

A `null` resource is an authorization deny (`403`), not a `404`, so missing ids
and foreign ids do not leak existence.

If the resolver throws (database down), the error propagates. That is an
infrastructure failure, not a deny decision.

### A resource policy must check something about the object

Naming a resource loads the row and hands it to the route. It does not, by
itself, decide anything about it. A policy that names `resource` therefore has
to pair it with at least one object-level check — `tenant`, `ownership`, or a
handler — or it is rejected with `MissingObjectCheckError`:

```ts
// ❌ MissingObjectCheckError: loads the invoice, checks nothing about it
@Authorize({ resource: 'invoice', action: 'read' })

// ❌ roles and scopes gate the route, not the object
@Authorize({ resource: 'invoice', action: 'read', roles: ['admin'] })

// ✅ any one of these is a real object-level check
@Authorize({ resource: 'invoice', tenant: true })
@Authorize({ resource: 'invoice', ownership: true })
@Authorize({ resource: 'invoice', handlers: ['invoice.canRead'] })
```

The check may come from either layer: `resource` on the controller and
`ownership: true` on the method compose into a valid policy.

`action` is **descriptive metadata**. It reaches handlers as `context.action`
and shows up in deny logs, and it never denies anything on its own. Do not
read `action: 'read'` as a restriction.

If a route genuinely needs `resource` with no object check — say it is gated by
roles alone and only wants `@AuthorizedResource()` to avoid a second query —
say so explicitly:

```ts
@Authorize({
  resource: 'invoice',
  roles: ['admin'],
  unsafeSkipObjectCheck: true,
})
```

The flag is deliberately unpleasant to read, because every use of it is a route
where changing an id in the URL is checked by nothing.

---

## Custom policies

Use TypeScript handlers instead of a policy language:

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

```ts
@Post(':id/approve')
@Authorize({
  resource: 'invoice',
  action: 'approve',
  roles: ['manager'],
  scopes: ['invoice:approve'],
  tenant: true,
  handlers: ['invoice.canApprove'],
})
approve() {}
```

Every listed handler must allow. An unknown handler name is a configuration
error (fail closed), not a silent deny.

---

## `@AuthorizedResource`

The guard stores the loaded resource on the request under a `Symbol`, not
`request.resource`.

```ts
@Get(':id')
@Authorize({
  resource: 'invoice',
  ownership: true,
})
findOne(@AuthorizedResource() invoice: Invoice) {
  return invoice;
}
```

That avoids a second query in the controller.

---

## Policy composition

Controller and method policies are **merged**, not replaced.

```ts
@Controller('invoices')
@Authorize({ scopes: ['invoice:access'] })
export class InvoiceController {
  @Get(':id')
  @Authorize({ scopes: ['invoice:read'] })
  findOne() {}
}
```

The caller needs `invoice:access` **and** `invoice:read`.

Role lists are not concatenated into one `any` group. A controller requirement
of `staff` and a method requirement of `manager` both have to pass.

When any layer sets `tenant: true` or `ownership: true`, the composed policy
keeps that check.

---

## Security model

- No `@Authorize()` metadata → the guard does not intervene.
- `@Authorize()` present → deny unless every requirement passes.
- Combination is AND: principal, roles, scopes, tenant, ownership, handlers.
- Evaluation runs in two phases. Principal, roles, and scopes are settled first,
  in memory. Only if they pass does the resource resolver run, followed by
  tenant, ownership, and handlers. A denied caller therefore costs no query and
  cannot tell an existing id from a missing one.
- A policy naming `resource` must also check the object (`tenant`, `ownership`,
  or a handler), or it fails closed. `action` is metadata and never denies.
- Policies are evaluated for HTTP contexts only. On any other transport
  (`rpc`, `ws`, `graphql`) a route that carries a policy fails closed, because
  there the transport payload — not the HTTP request — is what the guard would
  read `user` from.
- Authorization failures return **403 Forbidden** with body
  `{ "statusCode": 403, "message": "Forbidden", "error": "Forbidden" }`.
- Internal reason codes (`TENANT_MISMATCH`, `OWNERSHIP_MISMATCH`, …) stay out
  of the HTTP response.
- Missing resources return 403, not 404.
- Unknown handlers, unknown resource types, and resolver exceptions do not
  allow access.
- Logs may include policy, action, resource type, and reason code. They must
  not include tokens, cookies, request bodies, or full resources.

A user who is authenticated, has `invoice:read`, and can hit `GET /invoices/:id`
still gets **DENY** when invoice `123` belongs to another tenant. That is the
behavior this package exists to make routine.

### Logging and audit

Pass a `logger` to receive every decision. `warn` fires on denials with a flat
message; `decision` is optional and receives a structured event suitable for an
audit trail:

```ts
RoutePolicyModule.forRoot({
  logger: {
    warn: (message) => appLogger.warn(message),
    decision: (event) => auditStore.record(event),
  },
});
```

```ts
interface AuthorizationDecisionEvent {
  allowed: boolean;
  reason: AuthorizationReason;
  principalId?: string;
  resource?: string;
  action?: string;
  violations: readonly AuthorizationViolationType[];
}
```

The event carries violation **types**, never their messages — a message can
quote a handler's own reason, which is domain data. The request, its body, and
the resolved resource are deliberately absent, and no field identifies the
resource instance.

---

## Error behavior

| Situation                                       | Result                                                 |
| ----------------------------------------------- | ------------------------------------------------------ |
| Requirements not met                            | `403` deny                                             |
| Unauthenticated principal on a protected route  | `403` deny                                             |
| Resource resolver returns `null`                | `403` deny                                             |
| Unknown resource type or handler                | error (typically `500`)                                |
| Resolver / handler throws                       | error (typically `500`)                                |
| `resource` without an object-level check        | `MissingObjectCheckError` (typically `500`)            |
| Policy on a non-HTTP context                    | `UnsupportedExecutionContextError` (typically `500`)   |
| `@AuthorizedResource()` with no resource loaded | `AuthorizedResourceUnavailableError` (typically `500`) |
| More than one `@Authorize()` on the same target | `DuplicateRoutePolicyError` at module load             |

Deny is a valid negative decision. An infrastructure failure is not rewritten
into a deny, and it is never rewritten into an allow.

---

## Testing

The core evaluator does not need NestJS:

```ts
import { evaluatePolicy } from '@erickmorales/nest-route-policy';

const result = await evaluatePolicy({
  policy: { scopes: ['invoice:read'] },
  principal: { id: 'user-1', scopes: ['invoice:read'] },
});

expect(result.allowed).toBe(true);
```

The repository includes HTTP tests that swap invoice ids across tenants and
expect `403`. See `example/nestjs-invoices-api` for a runnable API.

---

## Architecture

```
core/        models, composer, evaluators (no NestJS)
registry/    resource and handler registries
testing/     evaluatePolicy, fakePrincipal
nest/        module, guard, decorators, principal resolver
```

`PolicyEvaluator` depends on none of `Reflector`, `ExecutionContext`, Express,
or Fastify.

---

## Limitations and roadmap

`0.1.x` supports NestJS HTTP applications.

Not in this release: `forRootAsync`, Fastify-specific tests, GraphQL,
WebSockets, microservices, role bypass modes, distributed caches, OPA
adapters, and audit pipelines. Custom `PolicyHandler` implementations are the
extension point for those later.

---

## License

MIT
