import { Inject, Injectable } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { AuthorizationContext } from '../../core/models/authorization-context.js';
import type { ComposedRoutePolicy } from '../../core/composition/policy-composer.js';
import { UnsupportedExecutionContextError } from '../../errors/unsupported-execution-context.error.js';
import { ResourceRegistry } from '../../registry/resource-registry.js';
import { PRINCIPAL_RESOLVER, ROUTE_POLICY_RESOURCE } from '../constants.js';
import type { PrincipalResolver } from '../resolvers/principal-resolver.js';

@Injectable()
export class AuthorizationContextFactory {
  constructor(
    @Inject(PRINCIPAL_RESOLVER) private readonly principalResolver: PrincipalResolver,
    @Inject(ResourceRegistry) private readonly resources: ResourceRegistry,
  ) {}

  async create(
    executionContext: ExecutionContext,
    policy: ComposedRoutePolicy,
  ): Promise<AuthorizationContext> {
    const base = await this.createBase(executionContext, policy);
    return this.withResource(policy, base);
  }

  /**
   * Everything that does not need the resource: principal, params, query. No
   * I/O, so a caller can reject a request before paying for a resource lookup.
   */
  async createBase(
    executionContext: ExecutionContext,
    policy: ComposedRoutePolicy,
  ): Promise<AuthorizationContext> {
    // Outside HTTP, `switchToHttp().getRequest()` hands back the transport
    // payload, so a caller-supplied message could pass itself off as the
    // request and its `user` as an authenticated principal. Fail closed.
    const contextType = executionContext.getType<string>();
    if (contextType !== 'http') {
      throw new UnsupportedExecutionContextError(contextType);
    }

    const request = executionContext.switchToHttp().getRequest<Record<PropertyKey, unknown>>();
    const principal = await this.principalResolver.resolve(executionContext);

    return {
      principal,
      params: readStringRecord(request['params']),
      query: readQuery(request['query']),
      request,
      ...(policy.action !== undefined ? { action: policy.action } : {}),
      ...(policy.resource !== undefined ? { resourceType: policy.resource } : {}),
    };
  }

  /**
   * Resolves the resource named by the policy and publishes it on the request
   * for `@AuthorizedResource()`. Returns the context untouched when the policy
   * names no resource.
   */
  async withResource(
    policy: ComposedRoutePolicy,
    context: AuthorizationContext,
  ): Promise<AuthorizationContext> {
    if (policy.resource === undefined) {
      return context;
    }

    const registration = this.resources.require(policy.resource);
    const resource = await registration.resolver.resolve(context);
    const request = context.request as Record<PropertyKey, unknown>;
    request[ROUTE_POLICY_RESOURCE] = resource;

    if (resource === null) {
      return {
        ...context,
        resource: null,
      };
    }

    return {
      ...context,
      resource,
      resourceAttributes: registration.attributes.resolve(resource),
    };
  }
}

function readStringRecord(value: unknown): Readonly<Record<string, string>> {
  if (value === null || value === undefined || typeof value !== 'object') {
    return {};
  }

  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === 'string') {
      result[key] = entry;
    }
  }
  return result;
}

function readQuery(value: unknown): Readonly<Record<string, unknown>> {
  if (value === null || value === undefined || typeof value !== 'object') {
    return {};
  }

  return { ...(value as Record<string, unknown>) };
}
