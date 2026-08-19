# Changelog

## Unreleased

### Security

- A policy that names `resource` without `tenant`, `ownership`, or a handler is
  now rejected with `MissingObjectCheckError` instead of loading the object and
  handing it to any authenticated caller. `action` never counted as a check and
  is now documented as descriptive metadata. Opt out explicitly with
  `unsafeSkipObjectCheck: true`.
- Policies reached on a non-HTTP execution context (`rpc`, `ws`, `graphql`) now
  raise `UnsupportedExecutionContextError`. There `switchToHttp().getRequest()`
  returns the transport payload, so a caller-supplied message could present its
  own `user` as an authenticated principal. Handlers without `@Authorize()` are
  unaffected on every transport.

### Changed

- **Breaking:** `RoutePolicy` accepts `unsafeSkipObjectCheck`, and
  `ComposedRoutePolicy` now carries it. Policies that relied on `resource`
  without an object-level check must add a check or the flag.

## 0.1.0

### Added

- Nest-free `PolicyEvaluator` for roles, scopes, ownership, tenant, and custom handlers
- `PolicyComposer` that merges controller and method policies
- `@Authorize()`, `RoutePolicyGuard`, and `RoutePolicyModule.forRoot()`
- Resource resolvers, attribute resolvers, and `@AuthorizedResource()`
- Deny-by-default evaluation with generic HTTP 403 bodies
- `evaluatePolicy()` testing helper
- Example NestJS invoices API and BOLA / ID manipulation tests
