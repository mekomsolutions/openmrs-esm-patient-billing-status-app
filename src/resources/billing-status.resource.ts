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

export const useVisits = (patientUuid: string) => {
  const customRepresentation = 'custom:(uuid,encounters:(orders),startDatetime,stopDatetime)';
  const apiUrl = `${restBaseUrl}/visit?patient=${patientUuid}&v=${customRepresentation}`;

  const { data, isLoading, isValidating, error } = useSWR<{ data: { results: PatientVisit[] } }>(
    patientUuid ? apiUrl : null,
    openmrsFetch,
  );

  const flattenedVisits = useMemo(() => {
    if (!data) return [];

    const visits: BillingVisit[] = [];
    data.data.results.forEach((visit) => {
      visit.encounters?.forEach((encounter) => {
        encounter.orders?.forEach((order) => {
          visits.push({
            uuid: visit.uuid,
            order: order.uuid,
            startDate: visit.startDatetime,
            endDate: visit.stopDatetime,
          });
        });
      });
    });

    return visits;
  }, [data]);

  return {
    visits: flattenedVisits,
    isLoading,
    isValidating,
    error,
  };
};

export const useOrders = (patientUuid: string, config: Config) => {
  const apiUrl = `${restBaseUrl}/erp/order?rep=custom:order_lines,date,date_order,name,number,product_id,${config.orderExternalIdFieldName}`;

  const { data, error, isLoading, isValidating } = useSWR<{ data: ErpOrder[] }>(
    patientUuid ? [apiUrl, patientUuid] : null,
    async () =>
      openmrsFetch(apiUrl, {
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
      }),
  );

  return {
    orders: data?.data ?? [],
    isLoading,
    isValidating,
    error,
  };
};

export const useInvoices = (patientUuid: string, config: Config) => {
  const apiUrl = `${restBaseUrl}/erp/invoice?rep=custom:invoice_lines,date,payment_state,invoice_date_due,name`;

  const { data, error, isLoading, isValidating } = useSWR<{ data: ErpInvoice[] }>(
    patientUuid ? [apiUrl, patientUuid] : null,
    async () =>
      openmrsFetch(apiUrl, {
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
      }),
  );

  return {
    invoices: data?.data ?? [],
    isLoading,
    isValidating,
    error,
  };
};

const processBillingLines = (orders: ErpOrder[], invoices: ErpInvoice[], config: Config): BillingLine[] => {
  const lines: BillingLine[] = [];

  // Process order lines
  orders.forEach((order) => {
    order.order_lines.forEach((orderLine) => {
      const tags: string[] = [BillingCondition.ORDER];

      if (orderLine.qty_invoiced === 0) {
        tags.push(BillingCondition.NOT_INVOICED);
      } else if (orderLine.qty_invoiced > 0 && orderLine.qty_to_invoice > 0) {
        tags.push(BillingCondition.PARTIALLY_INVOICED);
      } else if (orderLine.qty_to_invoice <= 0) {
        tags.push(BillingCondition.FULLY_INVOICED);
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
      const tags: string[] = [BillingCondition.INVOICED];

      if (invoice.payment_state === 'paid') {
        tags.push(BillingCondition.PAID);
      } else {
        tags.push(BillingCondition.NOT_PAID);
      }

      if (new Date(invoice.date_due) >= new Date()) {
        tags.push(BillingCondition.OVERDUE);
      } else {
        tags.push(BillingCondition.NOT_OVERDUE);
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

const setVisitToLines = (lines: BillingLine[], visits: BillingVisit[]): BillingLine[] => {
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

const isLineApproved = (tags: string[], config: Config): boolean => {
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
    config.nonApprovedConditions.some(
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

const shouldRetireLine = (tags: string[], config: Config): boolean => {
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

const groupByVisits = (lines: BillingLine[]): GroupedBillingLines => {
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

const groupLinesByDay = (linesToGroup: BillingLine[]): GroupedBillingLines => {
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
    orders,
    isLoading: loadingOrders,
    error: ordersError,
    isValidating: validatingOrders,
  } = useOrders(patientUuid, config);
  const {
    invoices,
    isLoading: loadingInvoices,
    error: invoicesError,
    isValidating: validatingInvoices,
  } = useInvoices(patientUuid, config);

  const billingLines = useMemo(() => {
    if (!orders || !invoices) return null;
    return processBillingLines(orders, invoices, config);
  }, [orders, invoices, config]);

  const groupedLines = useMemo(() => {
    if (!billingLines) return {};
    return groupLinesByDay(billingLines);
  }, [billingLines]);

  return {
    groupedLines,
    isLoading: loadingOrders || loadingInvoices,
    error: invoicesError || ordersError,
    isValidating: validatingInvoices || validatingOrders,
  };
};
