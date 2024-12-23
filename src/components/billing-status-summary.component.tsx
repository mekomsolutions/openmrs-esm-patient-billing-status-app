import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckmarkOutlineIcon,
  CloseOutlineIcon,
  ErrorState,
  useLayoutType,
  usePagination,
} from '@openmrs/esm-framework';
import { CardHeader, EmptyState, PatientChartPagination } from '@openmrs/esm-patient-common-lib';
import styles from './billing-status-summary.scss';
import {
  DataTable,
  DataTableSkeleton,
  InlineLoading,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableExpandedRow,
  TableExpandHeader,
  TableExpandRow,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import { useBillingStatus } from '../resources/billing-status.resource';
import classNames from 'classnames';
import { type BillingLine, type BillingLineGroup } from '../types';

interface PatientBillingStatusSummaryProps {
  patient: fhir.Patient;
}

const PatientBillingStatusSummary: React.FC<PatientBillingStatusSummaryProps> = ({ patient }) => {
  const defaultPageSize = 10;
  const { t } = useTranslation();
  const headerTitle = t('billingStatus', 'Billing Status');
  const displayText = t('billingDetails', 'Billing Details');
  const layout = useLayoutType();
  const isTablet = layout === 'tablet';
  const isDesktop = !isTablet;

  const { groupedLines, isLoading, isValidating, error } = useBillingStatus(patient.id);

  const tableRows = useMemo<BillingLineGroup[]>(() => {
    if (!groupedLines) return [];
    return Object.entries(groupedLines).map(([_, group]) => {
      return group;
    });
  }, [groupedLines]);

  const { results: paginatedRows, goTo, currentPage } = usePagination(tableRows, defaultPageSize);

  const headers = [
    { key: 'date', header: t('date', 'Date') },
    { key: 'status', header: t('status', 'Status') },
  ];

  if (isLoading) return <DataTableSkeleton role="progressbar" compact={isDesktop} zebra />;
  if (error) return <ErrorState error={error} headerTitle={headerTitle} />;
  if (tableRows.length === 0) return <EmptyState displayText={displayText} headerTitle={headerTitle} />;

  return (
    <div className={styles.widgetCard}>
      <CardHeader title={headerTitle}>
        <span>{isValidating ? <InlineLoading /> : null}</span>
      </CardHeader>
      <DataTable
        aria-label={t('orderBillingStatuses', 'Order Billing Statuses')}
        data-floating-menu-container
        size={isTablet ? 'lg' : 'sm'}
        overflowMenuOnHover={!isTablet}
        isSortable
        rows={paginatedRows}
        headers={headers}
        useZebraStyles
      >
        {({
          rows,
          headers,
          getHeaderProps,
          getRowProps,
          getTableProps,
          getTableContainerProps,
          getExpandHeaderProps,
        }) => (
          <TableContainer {...getTableContainerProps()}>
            <Table {...getTableProps()} className={styles.table}>
              <TableHead className={classNames(styles.productiveHeading01, styles.text02)}>
                <TableRow>
                  <TableExpandHeader enableToggle {...getExpandHeaderProps()} />
                  {headers.map((header: { header: string }) => (
                    <TableHeader {...getHeaderProps({ header })}>{header.header}</TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row: { id: React.Key; cells: { value: any }[]; isExpanded: any }, index) => (
                  <React.Fragment key={row.id}>
                    <TableExpandRow className={styles.row} {...getRowProps({ row })}>
                      <TableCell>{row.cells[0].value}</TableCell>
                      <TableCell>
                        {row.cells[1].value ? (
                          <CheckmarkOutlineIcon className={styles.approvedIcon} />
                        ) : (
                          <CloseOutlineIcon className={styles.warningIcon} />
                        )}
                      </TableCell>
                    </TableExpandRow>
                    {row.isExpanded ? (
                      <TableExpandedRow colSpan={headers.length + 2}>
                        <ExpandedRowContent rowId={row.id} rowIndex={index} parentTableRows={tableRows} />
                      </TableExpandedRow>
                    ) : (
                      <TableExpandedRow className={styles.hiddenRow} colSpan={headers.length + 2} />
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
      <div className={styles.paginationContainer}>
        <PatientChartPagination
          pageNumber={currentPage}
          totalItems={tableRows.length}
          currentItems={paginatedRows.length}
          pageSize={defaultPageSize}
          onPageNumberChange={({ page }) => goTo(page)}
        />
      </div>
    </div>
  );
};

const ExpandedRowContent = ({ rowId, rowIndex, parentTableRows }) => {
  const orders = useMemo(() => {
    const row = parentTableRows.find((row: BillingLineGroup) => row.id === rowId);
    if (row && row.lines) {
      return row.lines;
    }
    return [];
  }, [rowId, parentTableRows]);

  return (
    <div>
      {orders.map((order: BillingLine, index: number) => (
        <div
          key={order.id}
          className={classNames(styles.expandedTile, {
            [styles.expandedWhiteBgTile]: index % 2 === (rowIndex % 2 === 0 ? 0 : 1),
          })}
        >
          <div className={styles.statusIcon}>
            {order.approved ? (
              <CheckmarkOutlineIcon className={styles.approvedIcon} />
            ) : (
              <CloseOutlineIcon className={styles.warningIcon} />
            )}
          </div>
          <div className={styles.nameSection}>{order.displayName}</div>
          <div className={styles.documentSection}>{order.document}</div>
        </div>
      ))}
    </div>
  );
};
export default PatientBillingStatusSummary;
