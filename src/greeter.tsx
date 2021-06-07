import { useConfig } from '@openmrs/esm-framework';
import React from 'react';
import { Trans } from 'react-i18next';
import { Config } from './config-schema';
import styles from './greeter.css';
import { PatientGetter } from './patient-getter/patient-getter';

const Root: React.FC = () => {
  const config = useConfig() as Config;

  return (
    <div className={styles.container}>
      <div className={styles.greeting}>
        {config.casualGreeting ? <Trans key="casualGreeting">hey</Trans> : <Trans key="formalGreeting">hello</Trans>}{' '}
        {config.whoToGreet.join(', ')}
      </div>
      <PatientGetter />
    </div>
  );
};

export default Root;
