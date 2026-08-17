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
  "message": "Forbidden"
}
```

Internal reason codes and tenant / owner identifiers must not appear in that
body. Missing resources also return 403 rather than 404 so callers cannot
enumerate ids from the status code.

## Fail closed

Unknown handlers, unknown resource types, and thrown resolvers do not allow
access. A thrown resolver is an error, not a deny decision, and must not be
caught and turned into `return true`.

## Logging

Safe to log: policy, action, resource type, decision, reason code.

Do not log: tokens, JWTs, cookies, full resources, request bodies.
