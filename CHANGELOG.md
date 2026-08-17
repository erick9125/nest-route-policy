# Changelog

## 0.1.0

### Added

- Nest-free `PolicyEvaluator` for roles, scopes, ownership, tenant, and custom handlers
- `PolicyComposer` that merges controller and method policies
- `@Authorize()`, `RoutePolicyGuard`, and `RoutePolicyModule.forRoot()`
- Resource resolvers, attribute resolvers, and `@AuthorizedResource()`
- Deny-by-default evaluation with generic HTTP 403 bodies
- `evaluatePolicy()` testing helper
- Example NestJS invoices API and BOLA / ID manipulation tests
