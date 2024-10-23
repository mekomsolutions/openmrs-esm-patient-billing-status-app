import useSWR from 'swr';
import { useMemo } from 'react';
import { openmrsFetch, restBaseUrl, useConfig } from '@openmrs/esm-framework';
import { type BillingLine, type BillingVisit, type ErpInvoice, type ErpOrder, type PatientVisit } from '../types';
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

const fetchVisits = async (patientUuid: string) => {
  const customRepresentation = 'custom:(uuid,encounters:(orders),startDatetime,stopDatetime)';
  const apiUrl = `${restBaseUrl}/visit?patient=${patientUuid}&v=${customRepresentation}`;
  const response = await openmrsFetch<{ results: PatientVisit[] }>(apiUrl);

  const flattenedVisits: BillingVisit[] = [];
  response.data.results.forEach((visit) => {
    visit.encounters?.forEach((encounter) => {
      encounter.orders?.forEach((order) => {
        flattenedVisits.push({
          uuid: visit.uuid,
          order: order.uuid,
          startDate: visit.startDatetime,
          endDate: visit.stopDatetime,
        });
      });
    });
  });

  return flattenedVisits;
};

const fetchOrders = async (patientUuid: string, config: Config) => {
  const apiUrl = `${restBaseUrl}/erp/order?v=custom:(uuid,order_lines,date,date_order,name,number,${config.orderExternalIdFieldName})`;
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

const processBillingLines = (
  orders: ErpOrder[],
  invoices: ErpInvoice[],
  visits: BillingVisit[],
  config: Config,
): BillingLine[] => {
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
  const linesWithVisits = setVisitToLines(lines, visits);

  return linesWithVisits
    .map((line) => ({
      ...line,
      approved: isLineApproved(line.tags, config),
      retire: shouldRetireLine(line.tags, config),
    }))
    .filter((line) => !line.retire);
};

const setVisitToLines = (lines: BillingLine[], visits: BillingVisit[]): BillingLine[] => {
  return lines.map((line) => {
    const matchingVisit = visits.find((visit) => visit.order === line.order);
    if (matchingVisit) {
      return {
        ...line,
        visit: matchingVisit,
      };
    }
    return line;
  });
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
    const [orders, invoices, visits] = await Promise.all([
      fetchOrders(patientUuid, config),
      fetchInvoices(patientUuid, config),
      fetchVisits(patientUuid),
    ]);
    return processBillingLines(orders, invoices, visits, config);
  });

  const groupedLines = useMemo(() => {
    if (!billingLines) return {};

    return billingLines.reduce(
      (visitGroup, line) => {
        if (!visitGroup[line.visit.uuid]) {
          visitGroup[line.visit.uuid] = {
            visit: line.visit,
            approved: true,
            lines: [],
          };
        }
        visitGroup[line.visit.uuid].lines.push(line);
        visitGroup[line.visit.uuid].approved = visitGroup[line.visit.uuid].approved && line.approved;
        return visitGroup;
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
