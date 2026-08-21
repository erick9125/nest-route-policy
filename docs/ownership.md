# Ownership

Ownership compares `principal.id` with `resourceAttributes.ownerId`.

The domain object is never inspected for a field named `ownerId`. An
`ResourceAttributesResolver` maps whatever the application uses (`userId`,
`createdBy`, …) into `ResourceAttributes`.

Missing owner information fails closed: the request is denied.

`0.1.x` does not include role bypass (`admin` automatically owning everything).
If administrators must skip ownership, express that with a separate route
policy or a custom handler.
