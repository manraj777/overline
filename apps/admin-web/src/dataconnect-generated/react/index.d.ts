import { GetUsersData } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useGetUsers(options?: useDataConnectQueryOptions<GetUsersData>): UseDataConnectQueryResult<GetUsersData, undefined>;
export function useGetUsers(dc: DataConnect, options?: useDataConnectQueryOptions<GetUsersData>): UseDataConnectQueryResult<GetUsersData, undefined>;
