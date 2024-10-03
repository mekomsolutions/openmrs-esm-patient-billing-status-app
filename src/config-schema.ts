import { Type } from '@openmrs/esm-framework';

export const configSchema = {
  retireLinesConditions: {
    _type: Type.Array,
    _default: [['CANCELLED'], ['ORDER', 'FULLY_INVOICED']],
    _description: 'Conditions for retiring lines.',
    _elements: {
      _type: Type.Array,
      _elements: {
        _type: Type.String,
      },
    },
  },
  nonApprovedConditions: {
    _type: Type.Array,
    _default: [
      ['ORDER', 'NON_INVOICED'],
      ['INVOICE', 'OVERDUE', 'NOT_PAID'],
    ],
    _description: 'Conditions for non-approved status.',
    _elements: {
      _type: Type.Array,
      _elements: {
        _type: Type.String,
      },
    },
  },
  approvedConditions: {
    _type: Type.Array,
    _default: [
      ['INVOICE', 'PAID'],
      ['INVOICE', 'NOT_OVERDUE'],
    ],
    _description: 'Conditions for approved status.',
    _elements: {
      _type: Type.Array,
      _elements: {
        _type: Type.String,
      },
    },
  },
  patientUuidFieldName: {
    _type: Type.String,
    _default: 'partner_id',
    _description: 'The field name representing the patient UUID in the partner model.',
  },
  orderExternalIdFieldName: {
    _type: Type.String,
    _default: 'external_order_id',
    _description: 'The field name representing the external order ID.',
  },
};

export type Config = {
  retireLinesConditions: Array<Array<string>>;
  nonApprovedConditions: Array<Array<string>>;
  approvedConditions: Array<Array<string>>;
  patientUuidFieldName: string;
  orderExternalIdFieldName: string;
};
