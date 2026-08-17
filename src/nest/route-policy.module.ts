import { Global, Module, type DynamicModule, type Provider, type Type } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PolicyHandler } from '../core/contracts/policy-handler.js';
import type { ResourceAttributesResolver } from '../core/contracts/resource-attributes-resolver.js';
import type { ResourceResolver } from '../core/contracts/resource-resolver.js';
import { PolicyEvaluator } from '../core/evaluation/policy-evaluator.js';
import { PolicyHandlerRegistry } from '../registry/policy-handler-registry.js';
import { ResourceRegistry } from '../registry/resource-registry.js';
import { AuthorizationContextFactory } from './context/authorization-context.factory.js';
import {
  PRINCIPAL_RESOLVER,
  ROUTE_POLICY_LOGGER,
  ROUTE_POLICY_OPTIONS,
} from './constants.js';
import { RoutePolicyGuard } from './guards/route-policy.guard.js';
import { DefaultPrincipalResolver } from './resolvers/default-principal.resolver.js';
import type {
  ResourceDefinition,
  RoutePolicyModuleOptions,
} from './route-policy.options.js';

@Global()
@Module({})
export class RoutePolicyModule {
  static forRoot(options: RoutePolicyModuleOptions = {}): DynamicModule {
    const principalResolver = options.principalResolver ?? DefaultPrincipalResolver;
    const resources = options.resources ?? {};
    const policies = options.policies ?? [];
    const resourceTypes = Object.values(resources);

    return {
      module: RoutePolicyModule,
      imports: [...(options.imports ?? [])],
      providers: [
        Reflector,
        { provide: ROUTE_POLICY_OPTIONS, useValue: options },
        ...(options.logger ? [{ provide: ROUTE_POLICY_LOGGER, useValue: options.logger }] : []),
        principalResolver,
        { provide: PRINCIPAL_RESOLVER, useExisting: principalResolver },
        ...resourceTypes.map((definition) => definition.resolver),
        ...resourceTypes.map((definition) => definition.attributes),
        ...policies,
        RoutePolicyModule.resourceRegistryProvider(resources),
        RoutePolicyModule.policyHandlerRegistryProvider(policies),
        {
          provide: PolicyEvaluator,
          useFactory: (registry: PolicyHandlerRegistry) => new PolicyEvaluator(registry),
          inject: [PolicyHandlerRegistry],
        },
        AuthorizationContextFactory,
        RoutePolicyGuard,
      ],
      exports: [
        RoutePolicyGuard,
        PolicyEvaluator,
        AuthorizationContextFactory,
        ResourceRegistry,
        PolicyHandlerRegistry,
        ROUTE_POLICY_OPTIONS,
        PRINCIPAL_RESOLVER,
      ],
    };
  }

  private static resourceRegistryProvider(
    resources: Readonly<Record<string, ResourceDefinition>>,
  ): Provider {
    const names = Object.keys(resources);
    const inject: Type<ResourceResolver | ResourceAttributesResolver>[] = names.flatMap((name) => {
      const definition = resources[name];
      if (!definition) {
        return [];
      }
      return [definition.resolver, definition.attributes];
    });

    return {
      provide: ResourceRegistry,
      useFactory: (...instances: (ResourceResolver | ResourceAttributesResolver)[]) => {
        const registry = new ResourceRegistry();
        names.forEach((name, index) => {
          const resolver = instances[index * 2];
          const attributes = instances[index * 2 + 1];
          if (!resolver || !attributes) {
            return;
          }
          registry.register(name, {
            resolver: resolver as ResourceResolver,
            attributes: attributes as ResourceAttributesResolver,
          });
        });
        return registry;
      },
      inject,
    };
  }

  private static policyHandlerRegistryProvider(policies: readonly Type<PolicyHandler>[]): Provider {
    return {
      provide: PolicyHandlerRegistry,
      useFactory: (...handlers: PolicyHandler[]) => {
        const registry = new PolicyHandlerRegistry();
        for (const handler of handlers) {
          registry.register(handler);
        }
        return registry;
      },
      inject: [...policies],
    };
  }
}
