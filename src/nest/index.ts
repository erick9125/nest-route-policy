export { RoutePolicyModule } from './route-policy.module.js';
export { RoutePolicyGuard } from './guards/route-policy.guard.js';
export { Authorize } from './decorators/authorize.decorator.js';
export { AuthorizedResource } from './decorators/authorized-resource.decorator.js';
export { DefaultPrincipalResolver } from './resolvers/default-principal.resolver.js';
export type { PrincipalResolver } from './resolvers/principal-resolver.js';
export { AuthorizationContextFactory } from './context/authorization-context.factory.js';
export { RoutePolicyDeniedException } from '../errors/route-policy-denied.error.js';
export {
  ROUTE_POLICY_METADATA,
  ROUTE_POLICY_RESOURCE,
  ROUTE_POLICY_OPTIONS,
  PRINCIPAL_RESOLVER,
  ROUTE_POLICY_LOGGER,
} from './constants.js';
export type {
  RoutePolicyModuleOptions,
  RoutePolicyLogger,
  AuthorizationDecisionEvent,
  ResourceDefinition,
} from './route-policy.options.js';
