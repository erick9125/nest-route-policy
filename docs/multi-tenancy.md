# Multi-tenancy

When `tenant: true`, `principal.tenantId` must equal
`resourceAttributes.tenantId`.

Neither value is read from a guessed property on the resource. The attribute
resolver supplies `tenantId`. Empty or missing tenant ids are a deny, not an
allow.

The HTTP response does not include either tenant id. Internally the decision
reason is `tenant_mismatch`.
