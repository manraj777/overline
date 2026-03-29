import React from 'react';
import Head from 'next/head';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, Ban, CheckCircle } from 'lucide-react';
import { Card, Badge, Button, Loading } from '@/components/ui';
import api from '@/lib/api';
import { AdminLayout } from '@/components/layout';

export default function FraudAlertsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', 'fraud'],
    queryFn: async () => {
      const { data } = await api.get('/admin/users?fraudScore_gt=50');
      return data;
    },
  });

  const suspendUser = useMutation({
    mutationFn: async ({ id, isSuspended }: { id: string; isSuspended: boolean }) => {
      const { data } = await api.patch(`/admin/users/${id}/suspend`, { isSuspended });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'fraud'] });
    },
  });

  if (isLoading) {
    return <Loading text="Loading fraud alerts..." />;
  }

  const users = data?.data || [];

  return (
    <AdminLayout>
      <Head>
        <title>Fraud Alerts - Overline Admin</title>
      </Head>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-red-500" />
          Fraud Monitoring
        </h1>
        <p className="text-gray-500 mt-1">Review accounts with high fraud scores (&gt; 50%). Suspend suspicious activity.</p>
      </div>

      <Card>
        {users.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
            <p className="text-gray-500">No high-risk accounts detected at the moment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b text-sm font-semibold text-gray-700 bg-gray-50">
                  <th className="p-4">User</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Fraud Score</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user: any) => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-gray-900">{user.name || 'Unknown'}</td>
                    <td className="p-4 text-sm text-gray-600">
                      <div>{user.phone || 'No phone'}</div>
                      <div className="text-xs text-gray-400">{user.email || 'No email'}</div>
                    </td>
                    <td className="p-4">
                      <Badge variant="error" className="bg-red-100 text-red-700 font-bold border border-red-200">
                        {user.fraudScore.toFixed(0)}%
                      </Badge>
                      <div className="text-xs text-gray-400 mt-1">Trust: {user.trustScore.toFixed(0)}%</div>
                    </td>
                    <td className="p-4">
                      {user.isActive ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="error">Suspended</Badge>
                      )}
                    </td>
                    <td className="p-4">
                      {user.isActive ? (
                        <Button
                          variant="danger"
                          size="sm"
                          isLoading={suspendUser.isPending}
                          onClick={() => suspendUser.mutate({ id: user.id, isSuspended: true })}
                        >
                          <Ban className="w-4 h-4 mr-2" />
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          isLoading={suspendUser.isPending}
                          onClick={() => suspendUser.mutate({ id: user.id, isSuspended: false })}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Reactivate
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AdminLayout>
  );
}
