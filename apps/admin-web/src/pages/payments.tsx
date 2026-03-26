import React from 'react';
import Head from 'next/head';
import { format } from 'date-fns';
import {
  CreditCard,
  Download,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Card, Badge, Button, Loading } from '@/components/ui';
import { useAdminBookings } from '@/hooks';
import { useAuthStore } from '@/stores/auth';
import api from '@/lib/api';
import { formatPrice, cn } from '@/lib/utils';

type PaymentFilter = 'ALL' | 'COMPLETED' | 'REFUNDED' | 'FAILED' | 'PENDING';

const STATUS_CONFIG: Record<string, { label: string; variant: any; icon: any }> = {
  COMPLETED: { label: 'Paid', variant: 'success', icon: CheckCircle },
  REFUNDED: { label: 'Refunded', variant: 'default', icon: RefreshCw },
  FAILED: { label: 'Failed', variant: 'error', icon: XCircle },
  PENDING: { label: 'Pending', variant: 'warning', icon: Clock },
  PROCESSING: { label: 'Processing', variant: 'info', icon: Clock },
};

export default function PaymentsPage() {
  const [filter, setFilter] = React.useState<PaymentFilter>('ALL');
  const [refunding, setRefunding] = React.useState<string | null>(null);
  const { data: bookingsData, isLoading, refetch } = useAdminBookings({ limit: 50 });
  const { shopId } = useAuthStore();

  // Extract payments from bookings
  const payments = React.useMemo(() => {
    if (!bookingsData?.data) return [];
    return bookingsData.data
      .filter((b: any) => b.payment)
      .map((b: any) => ({
        id: b.payment.id,
        bookingId: b.id,
        bookingNumber: b.bookingNumber,
        customerName: b.user?.name || b.customerName || 'Walk-in',
        amount: Number(b.payment.amount),
        method: b.payment.provider || 'CASH',
        status: b.payment.status,
        date: b.payment.paidAt || b.payment.createdAt,
      }));
  }, [bookingsData]);

  const filtered = React.useMemo(() => {
    if (filter === 'ALL') return payments;
    return payments.filter((p: any) => p.status === filter);
  }, [payments, filter]);

  // Summary stats
  const todayPaid = payments
    .filter((p: any) => p.status === 'COMPLETED')
    .reduce((s: number, p: any) => s + p.amount, 0);
  const refunded = payments
    .filter((p: any) => p.status === 'REFUNDED')
    .reduce((s: number, p: any) => s + p.amount, 0);

  const handleRefund = async (paymentId: string) => {
    if (!confirm('Are you sure you want to refund this payment?')) return;
    setRefunding(paymentId);
    try {
      await api.post(`/payments/${paymentId}/refund`);
      refetch();
    } catch (err) {
      alert('Refund failed. Please try again.');
    } finally {
      setRefunding(null);
    }
  };

  const downloadCSV = () => {
    const header = 'Booking #,Customer,Amount,Method,Status,Date\n';
    const rows = filtered
      .map(
        (p: any) =>
          `${p.bookingNumber},${p.customerName},${p.amount},${p.method},${p.status},${
            p.date ? format(new Date(p.date), 'yyyy-MM-dd HH:mm') : '-'
          }`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (isLoading) return <Loading text="Loading payments..." />;

  return (
    <>
      <Head>
        <title>Payments - Overline Admin</title>
      </Head>

      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
            <p className="text-gray-500">Track and manage all payment transactions</p>
          </div>
          <Button variant="outline" size="sm" onClick={downloadCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Total Collected</p>
            <p className="text-2xl font-bold text-green-600">{formatPrice(todayPaid)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Refunded</p>
            <p className="text-2xl font-bold text-red-500">{formatPrice(refunded)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Net Revenue</p>
            <p className="text-2xl font-bold text-gray-900">{formatPrice(todayPaid - refunded)}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {(['ALL', 'COMPLETED', 'PENDING', 'REFUNDED', 'FAILED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all',
                filter === f
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'text-gray-500 hover:bg-gray-50 border border-transparent'
              )}
            >
              {f === 'ALL' ? 'All' : STATUS_CONFIG[f]?.label || f}
              {f !== 'ALL' && (
                <span className="ml-1.5 text-xs opacity-60">
                  ({payments.filter((p: any) => p.status === f).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No payments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase p-4">Booking</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase p-4">Customer</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase p-4">Amount</th>
                    <th className="text-center text-xs font-medium text-gray-500 uppercase p-4">Method</th>
                    <th className="text-center text-xs font-medium text-gray-500 uppercase p-4">Status</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase p-4">Date</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((payment: any) => {
                    const config = STATUS_CONFIG[payment.status] || STATUS_CONFIG.PENDING;
                    return (
                      <tr key={payment.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                        <td className="p-4">
                          <span className="text-sm font-mono text-gray-700">#{payment.bookingNumber}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-gray-900">{payment.customerName}</span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            {formatPrice(payment.amount)}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-600">
                            {payment.method}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <Badge variant={config.variant}>{config.label}</Badge>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-sm text-gray-500">
                            {payment.date ? format(new Date(payment.date), 'MMM d, HH:mm') : '-'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {payment.status === 'COMPLETED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRefund(payment.id)}
                              isLoading={refunding === payment.id}
                              className="text-red-600 hover:text-red-700 hover:border-red-200"
                            >
                              <RefreshCw className="w-3.5 h-3.5 mr-1" />
                              Refund
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
