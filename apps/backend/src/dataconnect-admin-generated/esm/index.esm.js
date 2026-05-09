import { validateAdminArgs } from 'firebase-admin/data-connect';

export const connectorConfig = {
  connector: 'example',
  serviceId: 'teak-serenity-488010-f3-service',
  location: 'asia-southeast1'
};

export function getUsers(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrOptions, options, undefined);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetUsers', undefined, inputOpts);
}

