import type { ResourceAttributesResolver } from '../core/contracts/resource-attributes-resolver.js';
import type { ResourceResolver } from '../core/contracts/resource-resolver.js';
import { PolicyEvaluationError } from '../errors/policy-evaluation.error.js';
import { ResourceResolverNotFoundError } from '../errors/resource-resolver-not-found.error.js';

export interface ResourceRegistration {
  readonly resolver: ResourceResolver;
  readonly attributes: ResourceAttributesResolver;
}

export class ResourceRegistry {
  private readonly resources = new Map<string, ResourceRegistration>();

  register(resourceType: string, registration: ResourceRegistration): void {
    if (this.resources.has(resourceType)) {
      throw new PolicyEvaluationError(`Duplicate resource type: "${resourceType}".`);
    }

    this.resources.set(resourceType, registration);
  }

  get(resourceType: string): ResourceRegistration | undefined {
    return this.resources.get(resourceType);
  }

  require(resourceType: string): ResourceRegistration {
    const registration = this.resources.get(resourceType);
    if (!registration) {
      throw new ResourceResolverNotFoundError(resourceType);
    }
    return registration;
  }
}
