# Security

This package does not authenticate users. Authentication must happen before
`RoutePolicyGuard` executes. The library evaluates authorization using the
principal made available by the host application.

Authorization failures are denied by default.

## Object-level access

The library exists to make object-level checks routine: a caller may have
`invoice:read` and still be denied invoice `123` if that row belongs to another
tenant or owner. That helps with BOLA / IDOR. It does not prevent all BOLA
vulnerabilities. A route without a policy, a resolver that ignores the id, or a
principal mapper that copies the wrong tenant will still be unsafe.

## HTTP responses

Denied requests return:

```json
{
  "statusCode": 403,
  "message": "Forbidden",
  "error": "Forbidden"
}
```

Internal reason codes and tenant / owner identifiers must not appear in that
body. Missing resources also return 403 rather than 404 so callers cannot
enumerate ids from the status code.

## Enumeration resistance

Nothing is read from storage until the caller has proved they are authenticated
and hold the route's roles and scopes. A caller who fails any of those gets the
same generic 403 whether the id exists or not, and the resolver is never called,
so response timing does not separate the two either.

## Fail closed

Unknown handlers, unknown resource types, and thrown resolvers do not allow
access. A thrown resolver is an error, not a deny decision, and must not be
caught and turned into `return true`.

Two more configurations fail closed rather than allowing:

- **A policy that names `resource` but checks nothing about the object.**
  Without `tenant`, `ownership`, or a handler, the guard would load the row and
  hand it to any authenticated caller — the BOLA hole this package exists to
  close. It raises `MissingObjectCheckError`. `action` is descriptive metadata
  and never counts as a check. `unsafeSkipObjectCheck: true` is the explicit,
  auditable opt-out.
- **A policy reached on a non-HTTP execution context.** On `rpc`, `ws`, and
  `graphql`, `switchToHttp().getRequest()` returns the transport payload, so a
  caller-supplied message could present its own `user` as an authenticated
  principal. Policies are HTTP-only in `0.1.x` and raise
  `UnsupportedExecutionContextError` elsewhere. Handlers with no `@Authorize()`
  are unaffected on any transport.

## Logging

Safe to log: policy, action, resource type, decision, reason code.

Do not log: tokens, JWTs, cookies, full resources, request bodies.
