# Authorization model

A route without `@Authorize()` is not decided by this library.

A route with a policy is allowed only when **all** of the following hold:

1. An authenticated principal exists (`id` is a non-empty string).
2. Every role group passes (`any` or `all` according to `roleMode`).
3. Required scopes pass (`all` by default).
4. Tenant matches when `tenant: true`.
5. Ownership matches when `ownership: true`.
6. Every named custom handler allows.

Controller and method policies are merged. Role arrays from different layers
stay as separate groups so `staff` on the controller and `manager` on the
method both have to pass. Scopes and handlers are unioned and then evaluated
together.

Default modes, overridable in `RoutePolicyModule.forRoot({ defaults })` or on
the policy:

- `roleMode`: `'any'`
- `scopeMode`: `'all'`
