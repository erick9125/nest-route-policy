import { SetMetadata } from '@nestjs/common';
import type { RoutePolicy } from '../../core/models/route-policy.js';
import { DuplicateRoutePolicyError } from '../../errors/duplicate-route-policy.error.js';
import { ROUTE_POLICY_METADATA } from '../constants.js';

export const Authorize = (policy: RoutePolicy): MethodDecorator & ClassDecorator => {
  const setPolicy = SetMetadata(ROUTE_POLICY_METADATA, policy);

  const decorate = (
    target: object,
    propertyKey?: string | symbol,
    descriptor?: TypedPropertyDescriptor<unknown>,
  ): unknown => {
    // Nest stores method metadata on the function and class metadata on the
    // constructor. Own metadata only, so a policy inherited from a base
    // controller is not mistaken for a duplicate on the subclass.
    const holder: object = descriptor ? (descriptor.value as object) : target;
    if (Reflect.hasOwnMetadata(ROUTE_POLICY_METADATA, holder)) {
      throw new DuplicateRoutePolicyError(describe(target, propertyKey));
    }

    return (setPolicy as (...args: unknown[]) => unknown)(target, propertyKey, descriptor);
  };

  return decorate as MethodDecorator & ClassDecorator;
};

function describe(target: object, propertyKey?: string | symbol): string {
  if (propertyKey === undefined) {
    return (target as { name?: string }).name ?? 'anonymous class';
  }

  const owner = (target as { constructor?: { name?: string } }).constructor?.name ?? 'unknown';
  return `${owner}.${String(propertyKey)}`;
}
