import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, DataConnectSettings } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;
export const dataConnectSettings: DataConnectSettings;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface GetUsersData {
  users: ({
    id: string;
    name: string;
  } & User_Key)[];
}

export interface User_Key {
  id: string;
  __typename?: 'User_Key';
}

interface GetUsersRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetUsersData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetUsersData, undefined>;
  operationName: string;
}
export const getUsersRef: GetUsersRef;

export function getUsers(options?: ExecuteQueryOptions): QueryPromise<GetUsersData, undefined>;
export function getUsers(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetUsersData, undefined>;

