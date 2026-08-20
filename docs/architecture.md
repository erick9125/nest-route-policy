# Architecture

The package is split so authorization decisions can be tested without NestJS.

```
src/
  core/          models, composition, evaluators
  registry/      resource and handler lookup
  testing/       evaluatePolicy helper
  nest/          module, guard, decorators, HTTP context
  errors/        deny exception (Nest) and evaluation errors (core)
```

`PolicyEvaluator` never imports `Reflector`, `ExecutionContext`, Express, or
Fastify. The Nest layer reads metadata, builds an `AuthorizationContext`, and
asks the evaluator for a decision.

Public entry points:

- `@erickmorales91/nest-route-policy` — core types, evaluator, testing helpers
- `@erickmorales91/nest-route-policy/nest` — `RoutePolicyModule`, guard, decorators

The HTTP pipeline expected by `0.1.0`:

```
host authentication guard
        ↓
request.user  (AuthorizationPrincipal)
        ↓
RoutePolicyGuard
        ↓
claims phase: principal, roles, scopes   (in memory, no I/O)
        ↓
resource resolver (only if the claims passed)
        ↓
resource phase: tenant, ownership, handlers
        ↓
ALLOW or RoutePolicyDeniedException (403)
```
