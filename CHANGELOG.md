# Changelog

## 0.1.0

First release.

### Added

- A NestJS-free `PolicyEvaluator` covering roles, scopes, ownership, tenant, and
  custom handlers. Evaluation runs in two phases: principal, roles, and scopes
  settle in memory, and the resource resolver runs only if they pass.
- `@Authorize()` on controllers and methods, a `RoutePolicyGuard`, and
  `RoutePolicyModule.forRoot()`.
- `PolicyComposer`, which merges controller and method policies instead of
  letting the method replace the controller. Role lists from different layers
  stay separate groups, so both have to pass.
- Resource resolvers, attribute resolvers, and `@AuthorizedResource()` so the
  guard and the route share one load.
- `AuthorizationContext` exposing the principal, `params`, `query`, and `body`,
  so a resolver or handler does not have to reach into the raw request.
- `RoutePolicyLogger`: `warn(message)` for denials, plus an optional
  `decision(event)` receiving a structured `AuthorizationDecisionEvent` — the
  principal id, policy, reason, and violation types — suitable for an audit
  trail.
- `PolicyEvaluatorCollaborators`, an optional constructor argument for replacing
  a single requirement's semantics (hierarchical roles, for instance) without
  expressing it as a `PolicyHandler`.
- An error hierarchy where the suffix marks the boundary: `*Error` is an
  internal fault surfacing as a `500` and every one extends
  `PolicyEvaluationError`, while `RoutePolicyDeniedException` extends Nest's
  `ForbiddenException` and follows Nest's naming for a decision the framework
  turns into an HTTP response.
- `evaluatePolicy()` and `fakePrincipal()` testing helpers, so authorization
  rules can be unit-tested without booting NestJS.
- An example NestJS invoices API, plus BOLA / ID-manipulation tests that swap
  invoice ids across tenants and expect `403`.

### Security

- Routes without `@Authorize()` are left alone. Routes with a policy are denied
  unless every requirement passes, and requirements combine with AND.
- A policy naming a `resource` must also check the object — `tenant`,
  `ownership`, or a handler — or it is rejected with `MissingObjectCheckError`.
  Naming a resource loads the row; it does not, by itself, authorize anything.
  `action` is descriptive metadata and never denies. `unsafeSkipObjectCheck`
  opts out explicitly.
- Nothing is read from storage until the caller has proved they are
  authenticated and hold the route's roles and scopes. A denied caller costs no
  query and cannot tell an existing id from a missing one.
- Policies are evaluated for HTTP contexts only. On any other transport
  (`rpc`, `ws`, `graphql`) a route carrying a policy fails closed with
  `UnsupportedExecutionContextError`, because there
  `switchToHttp().getRequest()` returns the transport payload, and a
  caller-supplied message could otherwise present its own `user` as an
  authenticated principal. Handlers without `@Authorize()` are unaffected on
  every transport.
- Unknown handlers, unknown resource types, thrown resolvers, more than one
  `@Authorize()` on the same target, and `@AuthorizedResource()` with nothing
  loaded all fail closed. An infrastructure failure is never rewritten into a
  deny, and never into an allow.
- Denials return a generic `403`. Reason codes, tenant ids, and owner ids stay
  out of the response body, and the decision event carries violation types
  without their messages.
