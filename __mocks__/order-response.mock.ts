export const mockOrdersResponse = {
  data: [
    {
      name: 'ORD-001',
      date_order: '2024-01-01',
      order_lines: [
        {
          id: 1,
          name: 'Not Invoiced',
          qty_invoiced: 0,
          qty_to_invoice: 1,
          invoice_lines: [],
        },
        {
          id: 2,
          name: 'Partially Invoiced',
          qty_invoiced: 1,
          qty_to_invoice: 1,
          invoice_lines: [],
        },
        {
          id: 3,
          name: 'Fully Invoiced',
          qty_invoiced: 1,
          qty_to_invoice: 0,
          invoice_lines: [],
        },
      ],
    },
  ],
};
