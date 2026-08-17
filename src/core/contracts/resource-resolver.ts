import type { AuthorizationContext } from '../models/authorization-context.js';

export interface ResourceResolver<TResource = unknown, TContext = AuthorizationContext> {
  resolve(context: TContext): Promise<TResource | null>;
}
