export const mockGroupedLines = {
  '2023-05-01': {
    id: '2023-05-01',
    visit: {
      uuid: 'visit-1',
      order: 'order-uuid',
      startDate: '2023-05-01T00:00:00',
      endDate: '2023-05-01T23:59:59',
    },
    date: '2023-05-01',
    status: true,
    lines: [
      {
        id: '1',
        date: '2023-05-01',
        document: 'Order 001',
        order: 'Order 1',
        tags: ['ORDER', 'FULLY_INVOICED', 'PAID', 'NOT_OVERDUE'],
        displayName: 'Product 1',
        approved: true,
      },
      {
        id: '2',
        date: '2023-05-01',
        document: 'Order 001',
        order: 'Order 2',
        tags: ['ORDER', 'PARTIALLY_INVOICED', 'PAID', 'NOT_OVERDUE'],
        displayName: 'Product 2',
        approved: true,
      },
    ],
  },
};
