import useSWR from 'swr';
import { useMemo } from 'react';
import { formatDate, openmrsFetch, restBaseUrl, useConfig } from '@openmrs/esm-framework';
import {
  type BillingLine,
  type BillingVisit,
  type ErpInvoice,
  type ErpOrder,
  type GroupedBillingLines,
  type PatientVisit,
} from '../types';
import { BillingCondition, type Config } from '../config-schema';

const ORDER = 'ORDER';
const INVOICED = 'INVOICED';
const NOT_INVOICED = 'NOT_INVOICED';
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
  const apiUrl = `${restBaseUrl}/erp/order?rep=custom:order_lines,date,date_order,name,number,product_id,${config.orderExternalIdFieldName}`;
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
  const apiUrl = `${restBaseUrl}/erp/invoice?rep=custom:invoice_lines,date,payment_state,invoice_date_due,name`;
  const response = await openmrsFetch<ErpInvoice[]>(apiUrl, {
    method: 'POST',
    body: {
      filters: [
        {
          field: config.patientUuidFieldName,
          comparison: '=',
          value: patientUuid,
        },
        {
          field: 'move_type',
          comparison: '=',
          value: 'out_invoice',
        },
      ],
    },
  });

  return response.data;
};

export const processBillingLines = (orders: ErpOrder[], invoices: ErpInvoice[], config: Config): BillingLine[] => {
  const lines: BillingLine[] = [];

  // Process order lines
  orders.forEach((order) => {
    order.order_lines.forEach((orderLine) => {
      const tags: string[] = [ORDER];

      if (orderLine.qty_invoiced === 0) {
        tags.push(NOT_INVOICED);
      } else if (orderLine.qty_invoiced > 0 && orderLine.qty_to_invoice > 0) {
        tags.push(PARTIALLY_INVOICED);
      } else if (orderLine.qty_to_invoice <= 0) {
        tags.push(FULLY_INVOICED);
      }

      const line: BillingLine = {
        id: orderLine.id,
        date: order.date_order,
        document: order.name,
        order: orderLine.name, // TODO this should be reading the orderLine[config.orderExternalIdFieldName]
        tags,
        displayName: (orderLine.product_id[1] || orderLine.name).toString(),
        approved: false,
      };

      lines.push(line);
    });
  });

  // Process invoice lines
  invoices.forEach((invoice) => {
    invoice.invoice_lines.forEach((invoiceLine) => {
      const tags: string[] = [INVOICED];

      if (invoice.payment_state === 'paid') {
        tags.push(PAID);
      } else {
        tags.push(NOT_PAID);
      }

      if (new Date(invoice.invoice_date_due) <= new Date()) {
        tags.push(BillingCondition.OVERDUE);
      } else {
        tags.push(NOT_OVERDUE);
      }

      let orderId = ''; // TODO this should be the orderExternalId of the invoice order
      orders.forEach((order) => {
        order.order_lines.forEach((orderLine) => {
          if (!!orderLine.invoice_lines.length && orderLine.invoice_lines.includes(invoiceLine.id)) {
            orderId = orderLine.name;
          }
        });
      });

      if (orderId) {
        const line: BillingLine = {
          id: invoiceLine.id,
          date: invoice.date,
          document: invoice.name,
          order: orderId,
          tags,
          displayName: (invoiceLine.product_id[1] || invoiceLine.name).toString(),
          approved: false,
        };

        lines.push(line);
      }
    });
  });

  // Set visit, approval status and filter retired lines
  // const linesWithVisits = setVisitToLines(lines, visits);

  return lines
    .map((line) => ({
      ...line,
      approved: isLineApproved(line.tags, config),
      retire: shouldRetireLine(line.tags, config),
    }))
    .filter((line) => !line.retire);
};

export const setVisitToLines = (lines: BillingLine[], visits: BillingVisit[]): BillingLine[] => {
  return lines.map((line) => {
    // TODO this matching needs the external_id present on erp order to match the exact visit encounter order
    const matchingVisit = visits.find((visit) => line.order === visit.order);
    if (matchingVisit) {
      return {
        ...line,
        visit: matchingVisit,
      };
    }
    return line;
  });
};

export const isLineApproved = (tags: string[], config: Config): boolean => {
  return (
    config.approvedConditions.some(
      (condition) =>
        JSON.stringify(
          condition
            .split(',')
            .map((c) => c.trim())
            .sort(),
        ) === JSON.stringify(tags.sort()),
    ) ||
    !config.nonApprovedConditions.some(
      (condition) =>
        JSON.stringify(
          condition
            .split(',')
            .map((c) => c.trim())
            .sort(),
        ) === JSON.stringify(tags.sort()),
    )
  );
};

export const shouldRetireLine = (tags: string[], config: Config): boolean => {
  return config.retireLinesConditions.some(
    (condition) =>
      JSON.stringify(
        condition
          .split(',')
          .map((c) => c.trim())
          .sort(),
      ) === JSON.stringify(tags.sort()),
  );
};

export const groupByVisits = (lines: BillingLine[]): GroupedBillingLines => {
  const groupedLines: GroupedBillingLines = {};

  lines.forEach((line) => {
    if (!groupedLines[line.visit.uuid]) {
      groupedLines[line.visit.uuid] = {
        id: line.visit.uuid,
        visit: line.visit,
        date: `${formatDate(new Date(line.visit.startDate))} - ${formatDate(new Date(line.visit.endDate))}`,
        status: true,
        lines: [],
      };
    }

    groupedLines[line.visit.uuid].lines.push(line);
    groupedLines[line.visit.uuid].status = groupedLines[line.visit.uuid].status && line.approved;
  });

  return groupedLines;
};

export const groupLinesByDay = (linesToGroup: BillingLine[]): GroupedBillingLines => {
  const groupedLines: GroupedBillingLines = {};

  linesToGroup.forEach((line) => {
    const date = line.date.substring(0, 10);
    if (!groupedLines[date]) {
      groupedLines[date] = {
        id: date,
        visit: line.visit,
        date: formatDate(new Date(line.date), { time: false }),
        status: true,
        lines: [],
      };
    }

    groupedLines[date].lines.push(line);
    groupedLines[date].status = groupedLines[date].status && line.approved;
  });

  return groupedLines;
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
      //   TODO fetch patient visits fetchVisits(patientUuid)
    ]);
    return processBillingLines(orders, invoices, config);
  });

  const groupedLines = useMemo(() => {
    if (!billingLines) return {};
    return groupLinesByDay(billingLines);
  }, [billingLines]);

  return {
    groupedLines,
    isLoading: isLoading || (!error && !billingLines),
    error,
    isValidating,
  };
};
