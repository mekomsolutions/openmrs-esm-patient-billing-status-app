import { Type, validators } from '@openmrs/esm-framework';

/**
 * Represents the possible states of a billing line item
 */
export const BillingCondition = {
  ORDER: 'ORDER',
  INVOICED: 'INVOICED',
  NOT_INVOICED: 'NOT_INVOICED',
  FULLY_INVOICED: 'FULLY_INVOICED',
  PARTIALLY_INVOICED: 'PARTIALLY_INVOICED',
  PAID: 'PAID',
  NOT_PAID: 'NOT_PAID',
  OVERDUE: 'OVERDUE',
  NOT_OVERDUE: 'NOT_OVERDUE',
  CANCELLED: 'CANCELLED',
} as const;

export type BillingConditionType = keyof typeof BillingCondition;

/**
 * Type for condition groups that define billing states. Each group is a comma-separated string of condition names.
 */
export type ConditionGroup = string;

/**
 * Validates that condition groups don't contain conflicting states (e.g., INVOICED and NOT_INVOICED)
 */
const validateConditionGroup = (conditions: string) => {
  const conflictPairs = [
    ['INVOICED', 'NOT_INVOICED'],
    ['FULLY_INVOICED', 'PARTIALLY_INVOICED'],
    ['PAID', 'NOT_PAID'],
    ['OVERDUE', 'NOT_OVERDUE'],
  ];

  const conditionsArray = conditions.split(',');
  for (const pair of conflictPairs) {
    if (conditionsArray.includes(pair[0]) && conditionsArray.includes(pair[1])) {
      return `Condition group contains conflicting states: ${pair[0]} and ${pair[1]}`;
    }
  }
  return true;
};

/**
 * Configuration schema for the billing module
 */
export const configSchema = {
  retireLinesConditions: {
    _type: Type.Array,
    _default: [BillingCondition.CANCELLED, `${BillingCondition.ORDER},${BillingCondition.FULLY_INVOICED}`],
    _description: `Groups of conditions that determine when billing lines should be retired from the system. Each group is a comma-separated string of condition names, and multiple groups represent OR conditions. Available conditions: ${Object.values(
      BillingCondition,
    ).join(', ')}`,
    _elements: {
      _type: Type.String,
      _validators: [validators.oneOf(Object.values(BillingCondition)), validateConditionGroup],
    },
  },
  nonApprovedConditions: {
    _type: Type.Array,
    _default: [
      `${BillingCondition.INVOICED},${BillingCondition.NOT_PAID}`,
      `${BillingCondition.ORDER},${BillingCondition.NOT_INVOICED}`,
      `${BillingCondition.INVOICED},${BillingCondition.OVERDUE},${BillingCondition.NOT_PAID}`,
    ],
    _description: `Groups of conditions that determine non-approved billing status. Each group is a comma-separated string of condition names, and multiple groups represent OR conditions. Available conditions: ${Object.values(
      BillingCondition,
    ).join(', ')}`,
    _elements: {
      _type: Type.String,
      _validators: [validators.oneOf(Object.values(BillingCondition)), validateConditionGroup],
    },
  },
  approvedConditions: {
    _type: Type.Array,
    _default: [
      `${BillingCondition.INVOICED},${BillingCondition.PAID}`,
      `${BillingCondition.INVOICED},${BillingCondition.NOT_OVERDUE}`,
      `${BillingCondition.INVOICED},${BillingCondition.NOT_OVERDUE},${BillingCondition.PAID}`,
    ],
    _description: `Groups of conditions that determine approved billing status. Each group is a comma-separated string of condition names, and multiple groups represent OR conditions. Available conditions: ${Object.values(
      BillingCondition,
    ).join(', ')}`,
    _elements: {
      _type: Type.String,
      _validators: [validators.oneOf(Object.values(BillingCondition)), validateConditionGroup],
    },
  },
  patientUuidFieldName: {
    _type: Type.String,
    _default: 'partner_id',
    _description: 'The field name in the partner model that represents the patient UUID.',
  },
  orderExternalIdFieldName: {
    _type: Type.String,
    _default: 'external_order_id',
    _description: 'The field name in the system that represents the external order ID.',
  },
};

/**
 * Configuration type for the billing module
 */
export interface Config {
  retireLinesConditions: ConditionGroup[];
  nonApprovedConditions: ConditionGroup[];
  approvedConditions: ConditionGroup[];
  patientUuidFieldName: string;
  orderExternalIdFieldName: string;
}
