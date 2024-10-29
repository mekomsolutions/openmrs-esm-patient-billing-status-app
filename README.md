![Node.js CI](https://github.com/openmrs/openmrs-esm-patient-billing-status-app/workflows/Node.js%20CI/badge.svg)

# OpenMRS ESM Patient Billing Status App

This repository is for OpenMRS 3 to display the billing status of a patient on the patient chart
[OpenMRS Microfrontend](https://wiki.openmrs.org/display/projects/OpenMRS+3.0%3A+A+Frontend+Framework+that+enables+collaboration+and+better+User+Experience).

## Running this code

```sh
yarn  # to install dependencies
yarn start  # to run the dev server
```

Once it is running, a browser window should open with the OpenMRS 3 application. Log in and then navigate
to `/openmrs/spa/root`.

## Configuration

This module provides a comprehensive configuration schema for managing patient billing status, offering flexible control
over billing line conditions and system field mappings.

### Billing States

The module supports the following strongly-typed billing conditions:

1. Order status:

- `ORDER`

2. Invoice status:

- `INVOICED`
- `NOT_INVOICED`
- `FULLY_INVOICED`
- `PARTIALLY_INVOICED`

3. Payment status:

- `PAID`
- `NOT_PAID`

4. Due date status:

- `OVERDUE`
- `NOT_OVERDUE`

5. Cancellation status:

- `CANCELLED`

### Configuration Options

The module supports several configuration categories:

1. **Retire conditions**: Define when billing lines should be removed from view
2. **Approval conditions**: Specify combinations of states that indicate approved billing
3. **Non-approval conditions**: Define state combinations that indicate pending/problematic billing
4. **Field mapping**: Configure system field names for patient UUID and external order ID

### Validation

The module includes validation logic to prevent conflicting condition states, such as:

- `INVOICED` vs `NOT_INVOICED`
- `FULLY_INVOICED` vs `PARTIALLY_INVOICED`
- `PAID` vs `NOT_PAID`
- `OVERDUE` vs `NOT_OVERDUE`

### Configuration Example

```typescript
{
  {
    // Remove cancelled orders and fully invoiced orders from view
    retireLinesConditions: ['CANCELLED', 'ORDER,FULLY_INVOICED']

    // Define non-approved states
    nonApprovedConditions: [
      'INVOICED,NOT_PAID',
      'ORDER,NOT_INVOICED',
      'INVOICED,OVERDUE,NOT_PAID'
    ]

    // Define approved states
    approvedConditions: [
      'INVOICED,PAID',
      'INVOICED,NOT_OVERDUE',
      'INVOICED,NOT_OVERDUE,PAID'
    ]

    // System field mappings
    patientUuidFieldName: 'partner_id'
    orderExternalIdFieldName: 'external_order_id'
  }
}
```

## Contributing

For more information, please see
the [OpenMRS Frontend Developer Documentation](https://openmrs.github.io/openmrs-esm-core/#/).

In particular, the [Setup](https://openmrs.github.io/openmrs-esm-core/#/getting_started/setup) section can help you get
started developing microfrontends in general.
