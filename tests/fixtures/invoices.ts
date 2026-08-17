export interface Invoice {
  id: string;
  tenantId: string;
  ownerId: string;
  status: 'draft' | 'pending' | 'approved';
  amount: number;
}

export const TENANT_A = 'tenant-a';
export const TENANT_B = 'tenant-b';

export const USER_A = 'user-a';
export const USER_B = 'user-b';
export const MANAGER_A = 'manager-a';
export const ADMIN_A = 'admin-a';

export const INVOICE_A1 = 'invoice-a1';
export const INVOICE_A2 = 'invoice-a2';
export const INVOICE_B1 = 'invoice-b1';
export const INVOICE_B2 = 'invoice-b2';

export function createInvoiceStore(): Map<string, Invoice> {
  return new Map<string, Invoice>([
    [
      INVOICE_A1,
      {
        id: INVOICE_A1,
        tenantId: TENANT_A,
        ownerId: USER_A,
        status: 'draft',
        amount: 100,
      },
    ],
    [
      INVOICE_A2,
      {
        id: INVOICE_A2,
        tenantId: TENANT_A,
        ownerId: USER_A,
        status: 'pending',
        amount: 250,
      },
    ],
    [
      INVOICE_B1,
      {
        id: INVOICE_B1,
        tenantId: TENANT_B,
        ownerId: USER_B,
        status: 'pending',
        amount: 80,
      },
    ],
    [
      INVOICE_B2,
      {
        id: INVOICE_B2,
        tenantId: TENANT_B,
        ownerId: USER_B,
        status: 'approved',
        amount: 500,
      },
    ],
  ]);
}
