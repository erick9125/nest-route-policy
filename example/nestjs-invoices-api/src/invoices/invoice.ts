export interface Invoice {
  id: string;
  tenantId: string;
  ownerId: string;
  status: 'draft' | 'pending' | 'approved';
  amount: number;
}
