import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useBillingStatus } from '../resources/billing-status.resource';
import PatientBillingStatusSummary from './billing-status-summary.component';
import { getDefaultsFromConfigSchema, openmrsFetch, restBaseUrl, useConfig } from '@openmrs/esm-framework';
import { Config, configSchema } from '../config-schema';
import { renderWithSwr } from '../tools/test-utils';

const mockedUseConfig = jest.mocked(useConfig<Config>);

jest.mock('../resources/billing-status.resource', () => ({
  useBillingStatus: jest.fn(),
}));

jest.mock('../resources/billing-status.resource', () => ({
  useBillingStatus: jest.fn(),
}));

describe('PatientBillingStatusSummary', () => {
  beforeEach(() => {
    mockedUseConfig.mockReturnValue({
      ...getDefaultsFromConfigSchema(configSchema),
    });
  });

  it('should display loading state when isLoading is true', () => {
    (useBillingStatus as jest.Mock).mockImplementation(() => ({
      groupedLines: {},
      isLoading: true,
      isValidating: false,
      error: null,
    }));

    renderWithSwr(<PatientBillingStatusSummary patient={{ id: 'test-patient-uuid' }} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should display error state when error is present', () => {
    (useBillingStatus as jest.Mock).mockImplementation(() => ({
      groupedLines: {},
      isLoading: false,
      isValidating: false,
      error: new Error('Error fetching data'),
    }));

    renderWithSwr(<PatientBillingStatusSummary patient={{ id: 'test-patient-uuid' }} />);

    expect(screen.getByText(/Error State/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('should display empty state when there are no billing lines', () => {
    (useBillingStatus as jest.Mock).mockImplementation(() => ({
      groupedLines: {},
      isLoading: false,
      isValidating: false,
      error: null,
    }));

    renderWithSwr(<PatientBillingStatusSummary patient={{ id: 'test-patient-uuid' }} />);

    expect(screen.getByText(/There are no {{displayText}} to display for this patient/i)).toBeInTheDocument();
  });

  it('should display billing status summary correctly', async () => {
    const user = userEvent.setup();

    const mockGroupedLines = {
      '2023-05-01': {
        id: '2023-05-01',
        visit: { uuid: 'visit-1', startDate: '2023-05-01T00:00:00', endDate: '2023-05-01T23:59:59' },
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

    (useBillingStatus as jest.Mock).mockImplementation(() => ({
      groupedLines: mockGroupedLines,
      isLoading: false,
      isValidating: false,
      error: null,
    }));

    renderWithSwr(<PatientBillingStatusSummary patient={{ id: 'test-patient-uuid' }} />);

    screen.debug(null, 1000000000);
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('2023-05-01')).toBeInTheDocument();
    expect(screen.getByText(/CheckmarkOutlineIcon/i)).toBeInTheDocument();
  });
});
