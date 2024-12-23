import { defineConfigSchema, getAsyncLifecycle } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';

const moduleName = '@mekomsolutions/esm-patient-billing-status-app';

const options = {
  featureName: 'root-world',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}

export const patientBillingStatusOverview = getAsyncLifecycle(
  () => import('../src/components/billing-status-summary.component'),
  options,
);
