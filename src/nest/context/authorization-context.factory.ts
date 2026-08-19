import { Inject, Injectable } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { AuthorizationContext } from '../../core/models/authorization-context.js';
import type { ComposedRoutePolicy } from '../../core/composition/policy-composer.js';
import { PolicyEvaluationException } from '../../errors/policy-evaluation.error.js';
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
    // Outside HTTP, `switchToHttp().getRequest()` hands back the transport
    // payload, so a caller-supplied message could pass itself off as the
    // request and its `user` as an authenticated principal. Fail closed.
    const contextType = executionContext.getType<string>();
    if (contextType !== 'http') {
      throw new UnsupportedExecutionContextError(contextType);
    }

    const request = executionContext.switchToHttp().getRequest<Record<PropertyKey, unknown>>();
    const principal = await this.principalResolver.resolve(executionContext);
    const params = readStringRecord(request['params']);
    const query = readQuery(request['query']);

    const context: AuthorizationContext = {
      principal,
      params,
      query,
      request,
      ...(policy.action !== undefined ? { action: policy.action } : {}),
      ...(policy.resource !== undefined ? { resourceType: policy.resource } : {}),
    };

    if (policy.resource === undefined) {
      if (policy.tenant || policy.ownership) {
        throw new PolicyEvaluationException(
          'Tenant and ownership checks require a resource type on the policy.',
        );
      }
      return context;
    }

    const registration = this.resources.require(policy.resource);
    const resource = await registration.resolver.resolve(context);
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
