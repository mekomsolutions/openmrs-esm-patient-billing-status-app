import useSWR from 'swr';
import { useMemo } from 'react';
import { openmrsFetch, restBaseUrl, useConfig } from '@openmrs/esm-framework';
import { type BillingLine, type ErpInvoice, type ErpOrder } from '../types';
import { type Config } from '../config-schema';

const ORDER = 'ORDER';
const INVOICE = 'INVOICE';
const NON_INVOICED = 'NON INVOICED';
const FULLY_INVOICED = 'FULLY_INVOICED';
const PARTIALLY_INVOICED = 'PARTIALLY_INVOICED';
const PAID = 'PAID';
const NOT_PAID = 'NOT_PAID';
const OVERDUE = 'OVERDUE';
const NOT_OVERDUE = 'NOT_OVERDUE';

const fetchOrders = async (patientUuid: string, config: Config) => {
  const apiUrl = `${restBaseUrl}/erp/order?v=custom:(order_lines,date,date_order,name,number,${config.orderExternalIdFieldName})`;
  const response = await openmrsFetch<ErpOrder[]>(apiUrl, {
    method: 'POST',
    body: {
      filters: [
        {
          field: config.patientUuidFieldName,
          comparison: '=',
          value: patientUuid,
        },
      ],
    },
  });
  return response.data;
};

const fetchInvoices = async (patientUuid: string, config: Config) => {
  const apiUrl = `${restBaseUrl}/erp/invoice?v=custom:(invoice_lines,date,state,date_due,number)`;
  const response = await openmrsFetch<ErpInvoice[]>(apiUrl, {
    method: 'POST',
    body: {
      filters: [
        {
          field: config.patientUuidFieldName,
          comparison: '=',
          value: patientUuid,
        },
        // TODO check for exact filter needed for this
        // {
        //   field: 'type',
        //   comparison: '=',
        //   value: 'out_invoice',
        // },
      ],
    },
  });

  return response.data;
};

const processBillingLines = (orders: ErpOrder[], invoices: ErpInvoice[], config: Config): BillingLine[] => {
  const lines: BillingLine[] = [];

  // Process order lines
  orders.forEach((order) => {
    order.order_lines.forEach((orderLine) => {
      const tags: string[] = [ORDER];

      if (orderLine.qty_invoiced === 0) {
        tags.push(NON_INVOICED);
      } else if (orderLine.qty_invoiced > 0 && orderLine.qty_to_invoice > 0) {
        tags.push(PARTIALLY_INVOICED);
      } else if (orderLine.qty_to_invoice <= 0) {
        tags.push(FULLY_INVOICED);
      }

      const line: BillingLine = {
        id: orderLine.id,
        date: order.date_order,
        visit: {
          uuid: 'no-visit',
          startDate: null,
          endDate: null,
        },
        document: order.name,
        order: orderLine.external_id,
        tags,
        displayName: orderLine.display_name,
        approved: false,
      };

      lines.push(line);
    });
  });

  // Process invoice lines
  invoices.forEach((invoice) => {
    invoice.invoice_lines.forEach((invoiceLine) => {
      const tags: string[] = [INVOICE];

      if (invoice.state === 'paid') {
        tags.push(PAID);
      } else {
        tags.push(NOT_PAID);
      }

      if (new Date(invoice.date_due) >= new Date()) {
        tags.push(OVERDUE);
      } else {
        tags.push(NOT_OVERDUE);
      }

      const orderUuid = orders.find((order) => order.name === invoiceLine.origin)?.external_id || '';

      const line: BillingLine = {
        id: invoiceLine.id,
        date: invoice.date,
        visit: {
          uuid: 'no-visit',
          startDate: null,
          endDate: null,
        },
        document: invoice.number,
        order: orderUuid,
        tags,
        displayName: invoiceLine.display_name,
        approved: false,
      };

      lines.push(line);
    });
  });

  // Set approval status and filter retired lines
  return lines
    .map((line) => ({
      ...line,
      approved: isLineApproved(line.tags, config),
      retire: shouldRetireLine(line.tags, config),
    }))
    .filter((line) => !line.retire);
};

const isLineApproved = (tags: string[], config: Config): boolean => {
  let approved = false;

  config.approvedConditions.forEach((condition) => {
    if (condition.every((tag) => tags.includes(tag))) {
      approved = true;
    }
  });

  config.nonApprovedConditions.forEach((condition) => {
    if (condition.every((tag) => tags.includes(tag))) {
      approved = false;
    }
  });

  return approved;
};

const shouldRetireLine = (tags: string[], config: Config): boolean => {
  return config.retireLinesConditions.some((condition) => condition.every((tag) => tags.includes(tag)));
};

export const useBillingStatus = (patientUuid: string) => {
  const config: Config = useConfig();

  const {
    data: billingLines,
    error,
    isLoading,
    isValidating,
  } = useSWR<BillingLine[], Error>(patientUuid ? ['billingStatus', patientUuid] : null, async () => {
    const [orders, invoices] = await Promise.all([
      fetchOrders(patientUuid, config),
      fetchInvoices(patientUuid, config),
    ]);
    return processBillingLines(orders, invoices, config);
  });

  const groupedLines = useMemo(() => {
    if (!billingLines) return {};

    return billingLines.reduce(
      (acc, line) => {
        if (!acc[line.visit.uuid]) {
          acc[line.visit.uuid] = {
            visit: line.visit,
            approved: true,
            lines: [],
          };
        }
        acc[line.visit.uuid].lines.push(line);
        acc[line.visit.uuid].approved = acc[line.visit.uuid].approved && line.approved;
        return acc;
      },
      {} as Record<
        string,
        {
          visit: BillingLine['visit'];
          approved: boolean;
          lines: BillingLine[];
        }
      >,
    );
  }, [billingLines]);

  return {
    groupedLines,
    isLoading: isLoading || (!error && !billingLines),
    error,
    isValidating,
  };
};
