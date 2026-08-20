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

### Added

- `RoutePolicyLogger.decision(event)` — an optional hook receiving a structured
  `AuthorizationDecisionEvent` for every decision, allowed or denied, with the
  principal id, policy, reason, and violation types. `warn(message)` is
  unchanged. The event carries violation types only, never their messages.
- `PolicyEvaluator` accepts an optional `PolicyEvaluatorCollaborators` argument,
  so a requirement's semantics (hierarchical roles, for instance) can be
  replaced without expressing it as a `PolicyHandler`.
- `AuthorizationContext.body`, so a resolver or handler that needs the payload
  no longer has to cast `context.request`. Optional, and `evaluatePolicy()`
  accepts a matching `body` input.
- `RequirementEvaluation` is exported. It is the return type of four exported
  evaluators and consumers previously could not name it.

### Changed

- **Breaking:** `@AuthorizedResource()` now throws
  `AuthorizedResourceUnavailableError` when no resource was loaded for the
  route, instead of injecting `undefined` and letting the handler run as if it
  held an authorized object.
- **Breaking:** applying more than one `@Authorize()` to the same method or
  controller now throws `DuplicateRoutePolicyError` at module load. Metadata is
  overwritten, so one of the policies was previously discarded in silence.
- **Breaking:** a policy requiring `tenant` or `ownership` without a `resource`
  now throws `MissingResourceTypeError` at composition time. The check used to
  live in two places and fire per request.
- **Breaking:** `ResourceRegistry.register` rejects a duplicate resource type
  instead of silently replacing the resolver, matching `PolicyHandlerRegistry`.
- **Breaking:** `PolicyEvaluator` gained `evaluateClaims()` and
  `evaluateResource()`, and `AuthorizationContextFactory` gained `createBase()`
  and `withResource()`. `evaluate()` and `create()` keep their behaviour.
- **Breaking:** `RoutePolicy` accepts `unsafeSkipObjectCheck`, and
  `ComposedRoutePolicy` now carries it. Policies that relied on `resource`
  without an object-level check must add a check or the flag.
- Custom policy handlers stop at the first denial rather than running the rest
  once the decision is settled, and a handler's `reason` now reaches the
  violation message. That message stays internal — it is not in the 403 body.
- `@nestjs/common` and `@nestjs/core` are no longer optional peers, so a missing
  install warns instead of failing at runtime on the first `/nest` import.
- `ROUTE_POLICY_METADATA` is a `Symbol`, like the other four module constants.
  Code using the exported constant is unaffected.
- `DefaultPrincipalResolver` reads each optional field once instead of running
  every type guard twice, and `isOptionalString` is now `isString` — it never
  accepted `undefined`.
- `Reflector` is no longer re-provided by `RoutePolicyModule`; `@nestjs/core`
  already provides it globally.
- Coverage thresholds are enforced per file, so a well-covered module cannot
  mask a barely-tested one. Formatting is enforced by `npm run format:check`,
  wired into `check` and CI, and `.gitattributes` pins source line endings to
  LF so a Windows checkout does not diverge from it.
- Tests reset the invoice fixture between cases instead of sharing mutated state
  through `beforeAll`, which made them depend on execution order.

### Fixed

- `finalize-build.mjs` creates `dist/esm` before writing its `package.json`,
  instead of relying on the ESM build having run first.
- The documented 403 body now matches what NestJS actually returns: it includes
  `error: "Forbidden"` alongside `statusCode` and `message`.
- The Quick start shows the authentication guard registered before
  `RoutePolicyGuard`. Registered the other way round, every protected route
  denies.

## 0.1.0

### Added

- Nest-free `PolicyEvaluator` for roles, scopes, ownership, tenant, and custom handlers
- `PolicyComposer` that merges controller and method policies
- `@Authorize()`, `RoutePolicyGuard`, and `RoutePolicyModule.forRoot()`
- Resource resolvers, attribute resolvers, and `@AuthorizedResource()`
- Deny-by-default evaluation with generic HTTP 403 bodies
- `evaluatePolicy()` testing helper
- Example NestJS invoices API and BOLA / ID manipulation tests
