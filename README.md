![Node.js CI](https://github.com/openmrs/openmrs-esm-template-app/workflows/Node.js%20CI/badge.svg)

# OpenMRS ESM Template App

This repository provides a starting point for creating your own
[OpenMRS Microfrontend](https://wiki.openmrs.org/display/projects/OpenMRS+3.0%3A+A+Frontend+Framework+that+enables+collaboration+and+better+User+Experience).

For more information, please see the
[OpenMRS Frontend Developer Documentation](https://o3-docs.openmrs.org/#/).

In particular, the [Setup](https://o3-docs.openmrs.org/docs/frontend-modules/setup) section can help you get started developing microfrontends in general. The [Creating a microfrontend](https://o3-docs.openmrs.org/docs/recipes/create-a-frontend-module) section provides information about how to use this repository to create your own microfrontend.

## Running this code

```sh
yarn  # to install dependencies
yarn start  # to run the dev server
```

Once it is running, a browser window
should open with the OpenMRS 3 application. Log in and then navigate to `/openmrs/spa/root`.

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

### Bumping the Common Lib version

Make sure to bump the Common Lib version used here each time you cut a release of Patient Chart. Because Common Lib is
marked as a peer dependency and a Webpack module federation shared dependency, the copy of the Common Lib that the
framework loads
is the first one that gets loaded at runtime when frontend modules are registered. If this happens to be a different
version than what the Patient Chart expects, you might get some unexpected behavior in the Patient Chart. You can bump
the Common Lib version by running the following command:

```sh
yarn up @openmrs/esm-patient-common-lib
git checkout package.json
yarn
```

## Contributing

For more information, please see
the [OpenMRS Frontend Developer Documentation](https://openmrs.github.io/openmrs-esm-core/#/).

In particular, the [Setup](https://openmrs.github.io/openmrs-esm-core/#/getting_started/setup) section can help you get
started developing microfrontends in general.
