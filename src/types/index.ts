import type { OpenmrsResource } from '@openmrs/esm-framework';

export interface BillingLine {
  id: string;
  date: string;
  visit: {
    uuid: string;
    startDate: string;
    endDate: string;
  };
  document: string;
  order: string;
  tags: string[];
  displayName: string;
  approved: boolean;
}

export interface ErpOrder extends OpenmrsResource {
  order_lines: Array<{
    id: string;
    qty_invoiced: number;
    qty_to_invoice: number;
    external_id: string;
    display_name: string;
  }>;
  date_order: string;
  name: string;
}

export interface ErpInvoice extends OpenmrsResource {
  invoice_lines: Array<{
    id: string;
    origin: string;
    display_name: string;
  }>;
  date: string;
  date_due: string;
  state: string;
  number: string;
}
