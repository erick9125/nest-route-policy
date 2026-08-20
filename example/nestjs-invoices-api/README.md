# NestJS invoices example

A small HTTP API that shows how `@erickmorales91/nest-route-policy` enforces
object-level authorization on invoices.

This is a demonstration, not a production billing system. Authentication is a
header (`x-user`) so the example can focus on authorization.

## Data

| Invoice   | Tenant   | Owner  | Status  |
| --------- | -------- | ------ | ------- |
| invoice-a | tenant-a | user-a | pending |
| invoice-b | tenant-b | user-b | pending |

| User      | Tenant   | Roles   | Scopes                                              |
| --------- | -------- | ------- | --------------------------------------------------- |
| user-a    | tenant-a |         | `invoice:access`, `invoice:read`                    |
| user-b    | tenant-b |         | `invoice:access`, `invoice:read`                    |
| manager-a | tenant-a | manager | `invoice:access`, `invoice:read`, `invoice:approve` |
| admin-a   | tenant-a | admin   | `invoice:access`, `invoice:read`                    |

## Run

From the repository root:

```bash
npm install
npm run build
cd example/nestjs-invoices-api
npm install
npm start
```

## Try the BOLA case

User A can read their invoice:

```bash
curl -H "x-user: user-a" http://localhost:3000/invoices/invoice-a
```

User A cannot read tenant B's invoice by changing the id:

```bash
curl -H "x-user: user-a" http://localhost:3000/invoices/invoice-b
```

The second request returns `403 Forbidden` without revealing why.
