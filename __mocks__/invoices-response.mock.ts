export const mockInvoicesResponse = {
  data: [
    {
      name: 'INV-001',
      date: '2024-01-01',
      payment_state: 'paid',
      date_due: '2024-02-01',
      invoice_lines: [{ id: 1 }],
    },
    {
      name: 'INV-002',
      date: '2024-01-01',
      payment_state: 'unpaid',
      date_due: '2024-02-01',
      invoice_lines: [{ id: 2 }],
    },
    {
      name: 'INV-003',
      date: '2024-01-01',
      payment_state: 'partial',
      date_due: '2024-02-01',
      invoice_lines: [{ id: 3 }],
    },
  ],
};
