import { renderHook, waitFor } from '@testing-library/react';
import {
  type FetchResponse,
  formatDate,
  getDefaultsFromConfigSchema,
  openmrsFetch,
  restBaseUrl,
  useConfig,
} from '@openmrs/esm-framework';
import { BillingCondition, type Config, configSchema } from '../config-schema';
import {
  groupLinesByDay,
  isLineApproved,
  processBillingLines,
  setVisitToLines,
  shouldRetireLine,
  useBillingStatus,
  useInvoices,
  useOrders,
} from './billing-status.resource';
import { mockInvoicesResponse, mockOrdersResponse } from '../../__mocks__';
import { type ErpInvoice, type ErpOrder } from '../types';

const mockOpenmrsFetch = jest.mocked(openmrsFetch);
const mockUseConfig = jest.mocked(useConfig<Config>);
const mockFormatDate = jest.mocked(formatDate);
const mockRestBaseUrl = jest.mocked(restBaseUrl);

const mockConfig = getDefaultsFromConfigSchema(configSchema) as Config;

describe('useOrders', () => {
  beforeEach(() => {
    mockOpenmrsFetch.mockReset();
    mockUseConfig.mockReturnValue(mockConfig);
  });

  it('should handle various invoice quantities correctly', async () => {
    mockOpenmrsFetch.mockResolvedValueOnce(mockOrdersResponse as FetchResponse);
    const { result } = renderHook(() => useOrders('patient-1', mockConfig));

    await waitFor(() => {
      expect(result.current.orders[0].order_lines).toHaveLength(3);
    });
  });

  it('should handle network timeouts', async () => {
    mockOpenmrsFetch.mockRejectedValueOnce({ message: 'Internal server error', status: 500 });

    const { result } = renderHook(() => useOrders('patient-2', mockConfig));

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.error.message).toBe('Internal server error');
    });
  });
});

describe('useInvoices', () => {
  beforeEach(() => {
    mockOpenmrsFetch.mockReset();
    mockUseConfig.mockReturnValue(mockConfig);
  });

  it('should handle various payment states', async () => {
    mockOpenmrsFetch.mockResolvedValueOnce(mockInvoicesResponse as FetchResponse);
    const { result } = renderHook(() => useInvoices('patient-1', mockConfig));

    await waitFor(() => {
      expect(result.current.invoices).toHaveLength(3);
    });
  });

  it('should handle overdue and non-overdue invoices', async () => {
    const pastDueDate = new Date();
    pastDueDate.setDate(pastDueDate.getDate() - 1);

    const futureDueDate = new Date();
    futureDueDate.setDate(futureDueDate.getDate() + 1);

    const response = {
      data: [
        {
          name: 'INV-001',
          date: '2024-01-01',
          payment_state: 'unpaid',
          date_due: pastDueDate.toISOString(),
          invoice_lines: [{ id: 1 }],
        },
        {
          name: 'INV-002',
          date: '2024-01-01',
          payment_state: 'unpaid',
          date_due: futureDueDate.toISOString(),
          invoice_lines: [{ id: 2 }],
        },
      ],
    };

    mockOpenmrsFetch.mockResolvedValueOnce(response as FetchResponse);
    const { result } = renderHook(() => useInvoices('patient-2', mockConfig));

    await waitFor(() => {
      expect(result.current.invoices).toHaveLength(2);
    });
  });
});

describe('useBillingStatus', () => {
  const mockData = {
    orders: [
      {
        name: 'ORD-001',
        date_order: '2024-01-01',
        order_lines: [
          {
            id: 1,
            name: 'Product 1',
            qty_invoiced: 1,
            qty_to_invoice: 0,
            invoice_lines: [1],
            product_id: [1, 'Product 1'],
          },
        ],
      },
    ],
    invoices: [
      {
        name: 'INV-001',
        date: '2024-01-01',
        payment_state: 'paid',
        date_due: '2024-02-01',
        invoice_lines: [
          {
            id: 1,
            name: 'Invoice Line 1',
            product_id: [1, 'Product 1'],
          },
        ],
      },
    ],
    visits: [
      {
        uuid: 'visit-1',
        order: 'ORD-001',
        startDate: '2024-01-01',
        endDate: '2024-01-02',
      },
    ],
  };

  beforeEach(() => {
    mockOpenmrsFetch.mockReset();
    mockUseConfig.mockReturnValue(mockConfig);
  });

  it('should handle concurrent requests', async () => {
    mockOpenmrsFetch
      .mockResolvedValueOnce(mockData.orders as unknown as FetchResponse)
      .mockResolvedValueOnce(mockData.invoices as unknown as FetchResponse);

    const { result } = renderHook(() => useBillingStatus('patient-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(Object.keys(result.current.groupedLines)).toBeTruthy();
    });
  });
});

describe('Helper Functions', () => {
  describe('isLineApproved', () => {
    const testCases = [
      {
        tags: [BillingCondition.PAID, BillingCondition.INVOICED],
        expected: true,
        description: 'should approve fully invoiced and paid orders',
      },
      {
        tags: [BillingCondition.ORDER, BillingCondition.NOT_INVOICED],
        expected: false,
        description: 'should not approve non-invoiced orders',
      },
    ];

    testCases.forEach(({ tags, expected, description }) => {
      it(description, () => {
        expect(isLineApproved(tags, mockConfig)).toBe(expected);
      });
    });
  });

  describe('shouldRetireLine', () => {
    const testCases = [
      {
        tags: [BillingCondition.ORDER, BillingCondition.FULLY_INVOICED],
        expected: true,
        description: 'should retire fully invoiced orders',
      },
      {
        tags: [BillingCondition.ORDER, BillingCondition.NOT_INVOICED],
        expected: false,
        description: 'should not retire non-invoiced orders',
      },
    ];

    testCases.forEach(({ tags, expected, description }) => {
      it(description, () => {
        expect(shouldRetireLine(tags, mockConfig)).toBe(expected);
      });
    });
  });

  describe('groupLinesByDay', () => {
    it('should handle multiple lines on the same day', () => {
      const lines = [
        {
          id: 1,
          date: '2024-01-01T10:00:00',
          document: 'DOC-1',
          order: 'ORD-1',
          tags: [BillingCondition.ORDER],
          displayName: 'Product 1',
          approved: true,
          visit: { uuid: 'visit-1', order: 'order-1', startDate: '2024-01-01', endDate: '2024-01-02' },
        },
        {
          id: 2,
          date: '2024-01-01T14:00:00',
          document: 'DOC-2',
          order: 'ORD-2',
          tags: [BillingCondition.ORDER],
          displayName: 'Product 2',
          approved: false,
          visit: { uuid: 'visit-1', order: 'order-2', startDate: '2024-01-01', endDate: '2024-01-02' },
        },
      ];

      const result = groupLinesByDay(lines);
      expect(result['2024-01-01'].lines).toHaveLength(2);
      expect(result['2024-01-01'].status).toBe(false); // One line is not approved
    });

    it('should handle lines spanning multiple days', () => {
      const lines = [
        {
          id: 1,
          date: '2024-01-01',
          document: 'DOC-1',
          order: 'ORD-1',
          tags: [BillingCondition.ORDER],
          displayName: 'Product 1',
          approved: true,
          visit: { uuid: 'visit-1', order: 'order-1', startDate: '2024-01-01', endDate: '2024-01-02' },
        },
        {
          id: 2,
          date: '2024-01-02',
          document: 'DOC-2',
          order: 'ORD-2',
          tags: [BillingCondition.ORDER],
          displayName: 'Product 2',
          approved: true,
          visit: { uuid: 'visit-1', order: 'order-2', startDate: '2024-01-01', endDate: '2024-01-02' },
        },
      ];

      const result = groupLinesByDay(lines);
      expect(Object.keys(result)).toHaveLength(2);
      expect(result['2024-01-01'].status).toBe(true);
      expect(result['2024-01-02'].status).toBe(true);
    });
  });

  describe('setVisitToLines', () => {
    it('should correctly match visits to lines', () => {
      const lines = [
        {
          id: 1,
          date: '2024-01-01',
          document: 'DOC-1',
          order: 'order-1',
          tags: [BillingCondition.ORDER],
          displayName: 'Product 1',
          approved: true,
        },
      ];

      const visits = [
        {
          uuid: 'visit-1',
          order: 'order-1',
          startDate: '2024-01-01',
          endDate: '2024-01-02',
        },
      ];

      const result = setVisitToLines(lines, visits);
      expect(result[0].visit).toBeDefined();
      expect(result[0].visit.uuid).toBe('visit-1');
    });

    it('should handle lines without matching visits', () => {
      const lines = [
        {
          id: 1,
          date: '2024-01-01',
          document: 'DOC-1',
          order: 'non-existing-order',
          tags: [BillingCondition.ORDER],
          displayName: 'Product 1',
          approved: true,
        },
      ];

      const visits = [
        {
          uuid: 'visit-1',
          order: 'order-1',
          startDate: '2024-01-01',
          endDate: '2024-01-02',
        },
      ];

      const result = setVisitToLines(lines, visits);
      expect(result[0].visit).toBeUndefined();
    });
  });

  describe('processBillingLines', () => {
    it('should process orders and invoices correctly', () => {
      const orders = [
        {
          name: 'ORD-001',
          date_order: '2024-01-01',
          order_lines: [
            {
              id: 1,
              name: 'Product 1',
              qty_invoiced: 0,
              qty_to_invoice: 1,
              invoice_lines: [],
              product_id: [1, 'Product 1'],
            },
          ],
        },
      ] as unknown as ErpOrder[];

      const invoices = [
        {
          name: 'INV-001',
          date: '2024-01-01',
          payment_state: 'paid',
          date_due: '2024-02-01',
          invoice_lines: [
            {
              id: 1,
              name: 'Invoice Line 1',
              product_id: [1, 'Product 1'],
            },
          ],
        },
      ] as unknown as ErpInvoice[];

      const result = processBillingLines(orders, invoices, mockConfig);
      expect(result).toBeInstanceOf(Array);
      expect(result.some((line) => line.tags.includes(BillingCondition.NOT_INVOICED))).toBe(true);
    });

    it('should handle empty orders and invoices', () => {
      const result = processBillingLines([], [], mockConfig);
      expect(result).toHaveLength(0);
    });

    it('should correctly tag lines based on payment state', () => {
      const orders = [
        {
          name: 'ORD-001',
          date_order: '2024-01-01',
          order_lines: [
            {
              id: 1,
              name: 'Product 1',
              qty_invoiced: 1,
              qty_to_invoice: 0,
              invoice_lines: [1],
              product_id: [1, 'Product 1'],
            },
          ],
        },
      ] as unknown as ErpOrder[];

      const invoices = [
        {
          name: 'INV-001',
          date: '2024-01-01',
          payment_state: 'paid',
          date_due: '2024-02-01',
          invoice_lines: [
            {
              id: 1,
              name: 'Invoice Line 1',
              product_id: [1, 'Product 1'],
            },
          ],
        },
      ] as unknown as ErpInvoice[];

      const result = processBillingLines(orders, invoices, mockConfig);
      const invoiceLine = result.find((line) => line.tags.includes(BillingCondition.INVOICED));
      expect(invoiceLine.tags).toContain(BillingCondition.PAID);
    });

    it('should handle overdue status correctly', () => {
      const pastDueDate = new Date();
      pastDueDate.setDate(pastDueDate.getDate() - 1);

      const orders = [
        {
          name: 'ORD-001',
          date_order: '2024-01-01',
          order_lines: [
            {
              name: 'Product 1',
              qty_invoiced: 1,
              qty_to_invoice: 0,
              invoice_lines: [1],
              product_id: [1, 'Product 1'],
            },
          ],
        },
      ] as ErpOrder[];

      const invoices = [
        {
          name: 'INV-001',
          date: '2024-01-01',
          payment_state: 'unpaid',
          invoice_date_due: pastDueDate.toISOString(),
          invoice_lines: [
            {
              id: 1,
              name: 'Invoice Line 1',
              product_id: [1, 'Product 1'],
            },
          ],
        },
      ] as unknown as ErpInvoice[];

      const result = processBillingLines(orders, invoices, mockConfig);
      const invoiceLine = result.find((line) => line.tags.includes(BillingCondition.INVOICED));
      expect(invoiceLine.tags).toContain(BillingCondition.OVERDUE);
    });
  });
});
