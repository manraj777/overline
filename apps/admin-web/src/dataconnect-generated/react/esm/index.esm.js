import { getUsersRef, connectorConfig } from '../../esm/index.esm.js';
import { CallerSdkTypeEnum } from 'firebase/data-connect';
import { useDataConnectQuery, validateReactArgs } from '@tanstack-query-firebase/react/data-connect';


export function useGetUsers(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts } = validateReactArgs(connectorConfig, dcOrOptions, options);
  const ref = getUsersRef(dcInstance);
  return useDataConnectQuery(ref, inputOpts, CallerSdkTypeEnum.GeneratedReact);
}