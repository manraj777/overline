import { ConnectorConfig, DataConnect, OperationOptions, ExecuteOperationResponse } from 'firebase-admin/data-connect';

export const connectorConfig: ConnectorConfig;

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

/** Generated Node Admin SDK operation action function for the 'GetUsers' Query. Allow users to execute without passing in DataConnect. */
export function getUsers(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<GetUsersData>>;
/** Generated Node Admin SDK operation action function for the 'GetUsers' Query. Allow users to pass in custom DataConnect instances. */
export function getUsers(options?: OperationOptions): Promise<ExecuteOperationResponse<GetUsersData>>;

