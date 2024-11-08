import type { OpenmrsResource } from '@openmrs/esm-framework';

export interface PatientVisit {
  uuid: string;
  encounters?: Array<{
    orders?: Array<{
      uuid: string;
      display: string;
      drug: {
        display: string;
      };
    }>;
  }>;
  startDatetime: string;
  stopDatetime: string;
}

export interface BillingVisit {
  uuid: string;
  order: string;
  startDate: string;
  endDate: string;
}

export interface BillingLineGroup {
  id: string;
  visit: BillingLine['visit'];
  date?: string;
  status: boolean;
  lines: BillingLine[];
}

export type GroupedBillingLines = Record<string, BillingLineGroup>;

export interface BillingLine {
  id: string | number;
  date: string;
  visit?: BillingVisit;
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
    product_id: Array<number | string>;
    display_name: string;
    product_uom_qty: number;
    product_uom: Array<number | string>;
    invoice_lines: Array<number>;
    name: string;
  }>;
  date_order: string;
  name: string;
}

export interface ErpInvoice extends OpenmrsResource {
  invoice_lines: Array<{
    id: number;
    move_name: string;
    name: string;
    quantity: number;
    product_id: Array<number | string>;
    product_uom_id: Array<number | string>;
  }>;
  date: string;
  invoice_date_due: string;
  payment_state: string;
  invoice_origin: string;
  number: string;
}
