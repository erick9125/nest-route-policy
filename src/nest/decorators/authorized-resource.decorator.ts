import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { ROUTE_POLICY_RESOURCE } from '../constants.js';

export const AuthorizedResource = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<Record<PropertyKey, unknown>>();
    return request[ROUTE_POLICY_RESOURCE];
  },
);
