# Changelog

## Unreleased

### Security

- Authorization is evaluated in two phases. Principal, roles, and scopes are
  settled in memory first, and the resource resolver runs only if they pass. A
  denied caller no longer triggers a database lookup — previously every request,
  including anonymous ones, paid for one — and can no longer tell an existing id
  from a missing one, since the resource phase is never reached.
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

- **Breaking:** `@AuthorizedResource()` now throws
  `AuthorizedResourceUnavailableError` when no resource was loaded for the
  route, instead of injecting `undefined` and letting the handler run as if it
  held an authorized object.
- **Breaking:** applying more than one `@Authorize()` to the same method or
  controller now throws `DuplicateRoutePolicyError` at module load. Metadata is
  overwritten, so one of the policies was previously discarded in silence.
- **Breaking:** `PolicyEvaluator` gained `evaluateClaims()` and
  `evaluateResource()`, and `AuthorizationContextFactory` gained `createBase()`
  and `withResource()`. `evaluate()` and `create()` keep their behaviour.
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
