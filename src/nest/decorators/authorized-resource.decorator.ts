import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { AuthorizedResourceUnavailableError } from '../../errors/authorized-resource-unavailable.error.js';
import { ROUTE_POLICY_RESOURCE } from '../constants.js';

export const AuthorizedResource = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<Record<PropertyKey, unknown>>();

    // Key presence, not truthiness: handing the route `undefined` would let it
    // operate as if it held an authorized object. A resolved-to-null resource
    // never reaches the handler, because the guard denies first.
    if (!request || !(ROUTE_POLICY_RESOURCE in request)) {
      throw new AuthorizedResourceUnavailableError();
    }

    return request[ROUTE_POLICY_RESOURCE];
  },
);
