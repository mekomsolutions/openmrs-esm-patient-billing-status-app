// import React from 'react';
// import { render, screen } from '@testing-library/react';
// import userEvent from '@testing-library/user-event';
// import { useTranslation } from 'react-i18next';
// import { useBillingStatus } from '../resources/billing-status.resource';
// import { formatDate, useLayoutType } from '@openmrs/esm-framework';
// import PatientBillingStatusSummary from './billing-status-summary.component';
//
// const mockedUseLayoutType = jest.mocked(useLayoutType);
// const mockedFormatDate = jest.mocked(formatDate);
//
// jest.mock('../resources/billing-status.resource', () => ({
//   useBillingStatus: jest.fn(),
// }));
//
// const mockPatient = {
//   id: 'test-patient-id',
//   resourceType: 'Patient',
// };
//
// const mockBillingData = {
//   'visit-1': {
//     visit: {
//       uuid: 'visit-1',
//       startDate: '2024-01-01',
//       endDate: '2024-01-02',
//     },
//     approved: true,
//     lines: [
//       {
//         id: 'line-1',
//         displayName: 'Test Order 1',
//         approved: true,
//         document: 'DOC-001',
//       },
//     ],
//   },
//   'visit-2': {
//     visit: {
//       uuid: 'visit-2',
//       startDate: '2024-01-03',
//       endDate: '2024-01-04',
//     },
//     approved: false,
//     lines: [
//       {
//         id: 'line-2',
//         displayName: 'Test Order 2',
//         approved: false,
//         document: 'DOC-002',
//       },
//     ],
//   },
// };
//
// describe('PatientBillingStatusSummary', () => {
//   beforeEach(() => {
//     jest.clearAllMocks();
//
//     (useTranslation as jest.Mock).mockReturnValue({
//       t: (key: string) => key,
//     });
//
//     (useLayoutType as jest.Mock).mockReturnValue('small-desktop');
//
//     (useBillingStatus as jest.Mock).mockReturnValue({
//       groupedLines: mockBillingData,
//       isLoading: false,
//       isValidating: false,
//       error: null,
//     });
//   });
//
//   it('renders loading state correctly', () => {
//     (useBillingStatus as jest.Mock).mockReturnValue({
//       groupedLines: null,
//       isLoading: true,
//       isValidating: false,
//       error: null,
//     });
//
//     render(<PatientBillingStatusSummary patient={mockPatient} />);
//
//     expect(screen.getByRole('progressbar')).toBeInTheDocument();
//   });
//
//   it('renders error state correctly', () => {
//     const mockError = new Error('Test error');
//     (useBillingStatus as jest.Mock).mockReturnValue({
//       groupedLines: null,
//       isLoading: false,
//       isValidating: false,
//       error: mockError,
//     });
//
//     render(<PatientBillingStatusSummary patient={mockPatient} />);
//
//     expect(screen.getByText('billingStatus')).toBeInTheDocument();
//     expect(screen.getByText(/error/i)).toBeInTheDocument();
//   });
//
//   it('renders empty state when no data is available', () => {
//     (useBillingStatus as jest.Mock).mockReturnValue({
//       groupedLines: {},
//       isLoading: false,
//       isValidating: false,
//       error: null,
//     });
//
//     render(<PatientBillingStatusSummary patient={mockPatient} />);
//
//     expect(screen.getByText('billingDetails')).toBeInTheDocument();
//   });
//
//   it('renders billing status table with correct data', () => {
//     render(<PatientBillingStatusSummary patient={mockPatient} />);
//
//     expect(screen.getByText('Visit Date')).toBeInTheDocument();
//     expect(screen.getByText('Status')).toBeInTheDocument();
//
//     expect(screen.getByText('2024-01-01 - 2024-01-02')).toBeInTheDocument();
//     expect(screen.getByText('2024-01-03 - 2024-01-04')).toBeInTheDocument();
//   });
//
//   it('expands row to show order details when clicked', async () => {
//     const user = userEvent.setup();
//     render(<PatientBillingStatusSummary patient={mockPatient} />);
//
//     const expandButtons = screen.getAllByRole('button');
//     await user.click(expandButtons[1]);
//
//     expect(screen.getByText('Test Order 1')).toBeInTheDocument();
//     expect(screen.getByText('DOC-001')).toBeInTheDocument();
//   });
//
//   it('handles pagination correctly', async () => {
//     const largeDataSet = {};
//     for (let i = 1; i <= 15; i++) {
//       largeDataSet[`visit-${i}`] = {
//         visit: {
//           uuid: `visit-${i}`,
//           startDate: '2024-01-01',
//           endDate: '2024-01-02',
//         },
//         approved: true,
//         lines: [
//           {
//             id: `line-${i}`,
//             displayName: `Test Order ${i}`,
//             approved: true,
//             document: `DOC-${i.toString().padStart(3, '0')}`,
//           },
//         ],
//       };
//     }
//
//     (useBillingStatus as jest.Mock).mockReturnValue({
//       groupedLines: largeDataSet,
//       isLoading: false,
//       isValidating: false,
//       error: null,
//     });
//
//     const user = userEvent.setup();
//     render(<PatientBillingStatusSummary patient={mockPatient} />);
//
//     expect(screen.getByText('2024-01-01 - 2024-01-02')).toBeInTheDocument();
//
//     const nextPageButton = screen.getByRole('button', { name: /next page/i });
//     await user.click(nextPageButton);
//
//     expect(screen.getByText(/showing/i)).toBeInTheDocument();
//   });
//
//   it('adjusts layout based on screen size', () => {
//     (useLayoutType as jest.Mock).mockReturnValue('tablet');
//
//     const { rerender } = render(<PatientBillingStatusSummary patient={mockPatient} />);
//
//     expect(screen.getByRole('table')).toBeInTheDocument();
//
//     (useLayoutType as jest.Mock).mockReturnValue('large-desktop');
//     rerender(<PatientBillingStatusSummary patient={mockPatient} />);
//
//     expect(screen.getByRole('table')).toBeInTheDocument();
//   });
//
//   it('shows inline loading state when validating', () => {
//     (useBillingStatus as jest.Mock).mockReturnValue({
//       groupedLines: mockBillingData,
//       isLoading: false,
//       isValidating: true,
//       error: null,
//     });
//
//     render(<PatientBillingStatusSummary patient={mockPatient} />);
//
//     expect(screen.getByRole('progressbar')).toBeInTheDocument();
//   });
// });
