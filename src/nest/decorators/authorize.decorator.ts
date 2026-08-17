import { SetMetadata } from '@nestjs/common';
import type { RoutePolicy } from '../../core/models/route-policy.js';
import { ROUTE_POLICY_METADATA } from '../constants.js';

export const Authorize = (policy: RoutePolicy): MethodDecorator & ClassDecorator => {
  return SetMetadata(ROUTE_POLICY_METADATA, policy);
};
