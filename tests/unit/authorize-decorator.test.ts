import { describe, expect, it } from 'vitest';
import { DuplicateRoutePolicyError } from '../../src/errors/duplicate-route-policy.error.js';
import { ROUTE_POLICY_METADATA } from '../../src/nest/constants.js';
import { Authorize } from '../../src/nest/decorators/authorize.decorator.js';

describe('@Authorize', () => {
  it('stores the policy as route metadata', () => {
    class Controller {
      @Authorize({ roles: ['admin'] })
      remove(): void {}
    }

    const policy = Reflect.getMetadata(
      ROUTE_POLICY_METADATA,
      Controller.prototype.remove as object,
    );
    expect(policy).toEqual({ roles: ['admin'] });
  });

  it('rejects two policies on the same method instead of discarding one', () => {
    expect(() => {
      class Controller {
        @Authorize({ resource: 'invoice', tenant: true })
        @Authorize({ roles: ['admin'] })
        remove(): void {}
      }
      return Controller;
    }).toThrow(DuplicateRoutePolicyError);
  });

  it('rejects two policies on the same controller', () => {
    expect(() => {
      @Authorize({ scopes: ['invoice:access'] })
      @Authorize({ roles: ['admin'] })
      class Controller {}
      return Controller;
    }).toThrow(DuplicateRoutePolicyError);
  });

  it('names the offending target on the error', () => {
    expect(() => {
      class InvoiceController {
        @Authorize({ roles: ['manager'] })
        @Authorize({ roles: ['admin'] })
        approve(): void {}
      }
      return InvoiceController;
    }).toThrow(/InvoiceController\.approve/);
  });

  it('allows a subclass to keep a policy inherited from a base controller', () => {
    expect(() => {
      @Authorize({ scopes: ['invoice:access'] })
      class BaseController {
        @Authorize({ roles: ['admin'] })
        remove(): void {}
      }

      class ChildController extends BaseController {}
      return ChildController;
    }).not.toThrow();
  });

  it('allows a controller policy alongside a method policy', () => {
    expect(() => {
      @Authorize({ scopes: ['invoice:access'] })
      class Controller {
        @Authorize({ roles: ['admin'] })
        remove(): void {}
      }
      return Controller;
    }).not.toThrow();
  });
});

describe('@Authorize duplicate reporting', () => {
  it('names an anonymous class rather than reporting undefined', () => {
    expect(() => {
      const Anonymous = Authorize({ roles: ['admin'] })(
        Authorize({ scopes: ['a'] })(class {}) as never,
      );
      return Anonymous;
    }).toThrow(/anonymous class/);
  });
});
