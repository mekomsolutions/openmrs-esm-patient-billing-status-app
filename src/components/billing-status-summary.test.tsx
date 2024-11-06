import React from 'react';
import { screen } from '@testing-library/react';
import { useBillingStatus } from '../resources/billing-status.resource';
import PatientBillingStatusSummary from './billing-status-summary.component';
import { getDefaultsFromConfigSchema, openmrsFetch, restBaseUrl, useConfig } from '@openmrs/esm-framework';
import { Config, configSchema } from '../config-schema';
import { renderWithSwr } from '../tools/test-utils';
import { mockGroupedLines } from '../../__mocks__';

const mockedUseConfig = jest.mocked(useConfig<Config>);
const mockedUseBillingStatus = jest.mocked(useBillingStatus);

describe('PatientBillingStatusSummary', () => {
  beforeEach(() => {
    mockedUseConfig.mockReturnValue({
      ...getDefaultsFromConfigSchema(configSchema),
    });
  });

  it('should display loading state when isLoading is true', () => {
    mockedUseBillingStatus.mockImplementation(() => ({
      groupedLines: {},
      isLoading: true,
      isValidating: false,
      error: null,
    }));

    renderWithSwr(<PatientBillingStatusSummary patient={{ id: 'test-patient-uuid' }} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should display error state when error is present', () => {
    mockedUseBillingStatus.mockImplementation(() => ({
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
    mockedUseBillingStatus.mockImplementation(() => ({
      groupedLines: {},
      isLoading: false,
      isValidating: false,
      error: null,
    }));

    renderWithSwr(<PatientBillingStatusSummary patient={{ id: 'test-patient-uuid' }} />);

    expect(screen.getByText(/There are no {{displayText}} to display for this patient/i)).toBeInTheDocument();
  });

  it('should display billing status summary correctly', async () => {
    mockedUseBillingStatus.mockImplementation(() => ({
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
