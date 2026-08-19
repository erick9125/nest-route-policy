# Authorization model

A route without `@Authorize()` is not decided by this library.

A route with a policy is allowed only when **all** of the following hold:

1. The execution context is HTTP.
2. An authenticated principal exists (`id` is a non-empty string).
3. Every role group passes (`any` or `all` according to `roleMode`).
4. Required scopes pass (`all` by default).
5. Tenant matches when `tenant: true`.
6. Ownership matches when `ownership: true`.
7. Every named custom handler allows.

## Naming a resource is not a check

`resource` tells the guard how to load the object. `action` describes the
operation for handlers and logs. Neither decides anything by itself.

A composed policy that names `resource` without `tenant`, `ownership`, or a
handler is rejected with `MissingObjectCheckError` rather than allowing the
route to hand over an object nothing checked. `unsafeSkipObjectCheck: true`
opts out explicitly when that is really the intent.

Controller and method policies are merged. Role arrays from different layers
stay as separate groups so `staff` on the controller and `manager` on the
method both have to pass. Scopes and handlers are unioned and then evaluated
together.

Default modes, overridable in `RoutePolicyModule.forRoot({ defaults })` or on
the policy:

- `roleMode`: `'any'`
- `scopeMode`: `'all'`
