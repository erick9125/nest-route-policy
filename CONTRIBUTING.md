# Contributing

Thanks for contributing to Nest Route Policy.

## Development

```bash
npm install
npm run check:full
```

## Guidelines

- Keep `src/core` independent of NestJS, Express, and Fastify.
- Do not authenticate users in this library.
- Fail closed: unknown handlers, unknown resources, and thrown resolvers must
  not allow access.
- Do not put internal reason codes, tenant ids, or owner ids in HTTP bodies.
- Add unit, integration, or security tests for behavioral changes.

## Pull requests

1. Keep the change scoped.
2. Update docs when public API behavior changes.
3. Ensure `npm run check:full` passes.
