import type { ResourceAttributes } from '../models/resource-attributes.js';

export interface ResourceAttributesResolver<TResource = unknown> {
  resolve(resource: TResource): ResourceAttributes;
}
