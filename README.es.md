# Nest Route Policy

Autorización declarativa a nivel de recurso para NestJS.

> **Resumen en español.** La referencia completa —composición de policies,
> handlers personalizados, modelo de seguridad, comportamiento de errores— está
> en el [README en inglés](README.md), que es la documentación que se mantiene
> al día. Esta página cubre lo justo para entender el paquete y arrancar.

## El problema

Un handler de NestJS típico responde a una sola pregunta:

```ts
@Get(':id')
@UseGuards(JwtAuthGuard)
findOne(@Param('id') id: string) {
  return this.service.findById(id);
}
```

> ¿Está autenticado quien llama?

No responde a la que importa:

> ¿Puede _este_ usuario leer _esta_ factura?

`GET /invoices/100` funciona para cualquiera que tenga `invoice:read`, incluso
si la factura 100 pertenece a otro tenant o a otro dueño. Es la clase de fallo
que OWASP llama BOLA / IDOR: el endpoint está autorizado, el objeto no.

## Qué resuelve

Evalúa, en una sola decisión: principal autenticado, acción, recurso,
pertenencia (`ownership`), tenant, roles, scopes y policies personalizadas.

- `@Authorize()` en controllers y métodos, que se combinan con AND
- deny por defecto cuando hay una policy
- `403` genérico, sin filtrar códigos internos ni ids de tenant o dueño
- `@AuthorizedResource()` para que el guard y el controller compartan una carga
- un evaluador sin dependencia de NestJS, testeable en aislamiento

No es un IAM: no emite JWTs, no autentica, no reemplaza Passport. La
autenticación tiene que ocurrir **antes** de que corra `RoutePolicyGuard`.

## Instalación

```bash
npm install @erickmorales91/nest-route-policy
```

Requiere `@nestjs/common` y `@nestjs/core` (>= 10) en el proyecto. El núcleo
vive en la raíz del paquete y no carga NestJS; el guard, el módulo y los
decoradores se importan desde `@erickmorales91/nest-route-policy/nest`.

## Uso mínimo

Deja tu usuario autenticado en `request.user` con esta forma:

```ts
interface AuthorizationPrincipal {
  id: string;
  roles?: readonly string[];
  scopes?: readonly string[];
  tenantId?: string;
}
```

Registra el módulo y el guard global — **después** de tu guard de
autenticación, que es el que rellena `request.user`:

```ts
@Module({
  imports: [
    RoutePolicyModule.forRoot({
      resources: {
        invoice: {
          resolver: InvoiceResourceResolver,
          attributes: InvoiceAttributesResolver,
        },
      },
    }),
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useExisting: RoutePolicyGuard },
  ],
})
export class AppModule {}
```

Declara qué exige cada ruta:

```ts
@Get(':id')
@Authorize({
  resource: 'invoice',
  action: 'read',
  tenant: true,
})
findOne(@AuthorizedResource() invoice: Invoice) {
  return invoice;
}
```

Nombrar un `resource` obliga a comprobar algo sobre el objeto: `tenant`,
`ownership` o un handler. Una policy que solo declara `resource` y `action` se
rechaza, porque cargaría la fila sin verificar nada — justo el fallo que el
paquete existe para evitar. `action` es metadata descriptiva y nunca deniega
por sí sola.

## Licencia

MIT
