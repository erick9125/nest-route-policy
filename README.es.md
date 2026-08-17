# Nest Route Policy

Autorización declarativa a nivel de recurso para NestJS.

Nest Route Policy protege recursos de API con roles, scopes, ownership,
límites de tenant y políticas contextuales, sin acoplar la autorización a los
controladores ni al proveedor de autenticación.

**Promesa de `0.1.0`:** declarar requisitos de autorización en rutas NestJS y
evaluarlos contra el principal autenticado, el recurso, ownership, tenant,
roles, scopes y handlers personalizados.

También disponible en [inglés](README.md).

## El problema

Un `JwtAuthGuard` responde si el usuario está autenticado. No responde si ese
usuario puede leer **esa** factura. `GET /invoices/100` con el scope
`invoice:read` sigue siendo un fallo de autorización si la factura pertenece a
otro tenant u otro dueño (BOLA / IDOR).

## Qué no es

No es un IAM. No emite JWT, no inicia sesión y no guarda roles en base de
datos. La autenticación ocurre antes; esta librería decide ALLOW / DENY.

## Instalación

```bash
npm install @erickmorales/nest-route-policy
```

El evaluador vive en la raíz del paquete y no carga NestJS. Guards y
decoradores se importan desde `@erickmorales/nest-route-policy/nest`.

## Uso rápido

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

- Sin `@Authorize()` el guard no interviene.
- Con política, se niega el acceso salvo que se cumplan todos los requisitos.
- Roles: **any** por defecto. Scopes: **all** por defecto. Todo se combina con AND.
- Un recurso inexistente es `403`, no `404`.
- La respuesta HTTP es genérica (`Forbidden`). El motivo interno no se filtra.

Un usuario autenticado, con `invoice:read` y acceso al endpoint, recibe **DENY**
si la factura `123` es de otro tenant. Ese es el valor de la librería.

## Licencia

MIT
