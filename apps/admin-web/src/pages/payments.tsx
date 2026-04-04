import React from 'react';
import Head from 'next/head';
import { format, subDays } from 'date-fns';
import {
  CreditCard,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { Button, Loading } from '@/components/ui';
import { useAdminBookings } from '@/hooks';
import { useAuthStore } from '@/stores/auth';
import api from '@/lib/api';
import { formatPrice, cn } from '@/lib/utils';

type PaymentFilter = 'ALL' | 'COMPLETED' | 'REFUNDED' | 'FAILED' | 'PENDING';
type DateRange = 'TODAY' | '7D' | '30D' | 'ALL';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  COMPLETED: { label: 'Paid', color: 'bg-tertiary-fixed text-tertiary', icon: CheckCircle },
  REFUNDED: { label: 'Refunded', color: 'bg-surface-container-high text-outline', icon: RefreshCw },
  FAILED: { label: 'Failed', color: 'bg-error-container text-error', icon: XCircle },
  PENDING: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  PROCESSING: { label: 'Processing', color: 'bg-primary-fixed text-primary', icon: Clock },
};

export default function PaymentsPage() {
  const [filter, setFilter] = React.useState<PaymentFilter>('ALL');
  const [dateRange, setDateRange] = React.useState<DateRange>('ALL');
  const [refunding, setRefunding] = React.useState<string | null>(null);

  const queryParams = React.useMemo(() => {
    const params: any = { limit: 100 };
    if (dateRange === 'TODAY') params.date = format(new Date(), 'yyyy-MM-dd');
    else if (dateRange === '7D') params.startDate = format(subDays(new Date(), 7), 'yyyy-MM-dd');
    else if (dateRange === '30D') params.startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
    return params;
  }, [dateRange]);

  const { data: bookingsData, isLoading, refetch } = useAdminBookings(queryParams);
  const { shopId } = useAuthStore();

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

  const todayPaid = payments.filter((p: any) => p.status === 'COMPLETED').reduce((s: number, p: any) => s + p.amount, 0);
  const refunded = payments.filter((p: any) => p.status === 'REFUNDED').reduce((s: number, p: any) => s + p.amount, 0);

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
    const rows = filtered.map((p: any) => `${p.bookingNumber},${p.customerName},${p.amount},${p.method},${p.status},${p.date ? format(new Date(p.date), 'yyyy-MM-dd HH:mm') : '-'}`).join('\n');
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
        <title>Payments — Overline Admin</title>
        <meta name="description" content="Track and manage payment transactions." />
      </Head>

      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="label-m3 mb-2 block">Financial</span>
            <h1 className="text-3xl font-black tracking-tight text-on-surface">Payments</h1>
            <p className="text-on-surface-variant text-sm mt-1">Track and manage all transactions</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              title="Date Range"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="input-m3 w-auto"
            >
              <option value="TODAY">Today</option>
              <option value="7D">Last 7 Days</option>
              <option value="30D">Last 30 Days</option>
              <option value="ALL">All Time</option>
            </select>
            <button onClick={downloadCSV} className="btn-tonal px-4 py-2.5 text-xs">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="card-m3 p-6">
            <p className="metric-label mb-2">Total Collected</p>
            <p className="metric-value text-tertiary">{formatPrice(todayPaid)}</p>
          </div>
          <div className="card-m3 p-6">
            <p className="metric-label mb-2">Refunded</p>
            <p className="metric-value text-error">{formatPrice(refunded)}</p>
          </div>
          <div className="card-m3 p-6">
            <p className="metric-label mb-2">Net Revenue</p>
            <p className="metric-value">{formatPrice(todayPaid - refunded)}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {(['ALL', 'COMPLETED', 'PENDING', 'REFUNDED', 'FAILED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all',
                filter === f
                  ? 'bg-primary text-white shadow-button'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high border border-outline-variant/10'
              )}
            >
              {f === 'ALL' ? 'All' : STATUS_CONFIG[f]?.label || f}
              {f !== 'ALL' && (
                <span className="ml-1.5 opacity-60">({payments.filter((p: any) => p.status === f).length})</span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="card-m3 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <CreditCard className="w-14 h-14 text-outline-variant mx-auto mb-5" />
              <p className="text-on-surface-variant font-medium">No payments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-m3">
                <thead>
                  <tr>
                    <th>Booking</th>
                    <th>Customer</th>
                    <th className="text-right">Amount</th>
                    <th className="text-center">Method</th>
                    <th className="text-center">Status</th>
                    <th className="text-right">Date</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((payment: any) => {
                    const config = STATUS_CONFIG[payment.status] || STATUS_CONFIG.PENDING;
                    return (
                      <tr key={payment.id}>
                        <td><span className="font-mono font-bold text-xs">#{payment.bookingNumber}</span></td>
                        <td><span className="font-medium">{payment.customerName}</span></td>
                        <td className="text-right"><span className="font-bold">{formatPrice(payment.amount)}</span></td>
                        <td className="text-center">
                          <span className="badge-m3 bg-surface-container-high text-outline">{payment.method}</span>
                        </td>
                        <td className="text-center">
                          <span className={`badge-m3 ${config.color}`}>{config.label}</span>
                        </td>
                        <td className="text-right text-on-surface-variant text-xs">
                          {payment.date ? format(new Date(payment.date), 'MMM d, HH:mm') : '-'}
                        </td>
                        <td className="text-right">
                          {payment.status === 'COMPLETED' && (
                            <button
                              onClick={() => handleRefund(payment.id)}
                              disabled={refunding === payment.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-error bg-error-container/30 rounded-lg hover:bg-error-container transition-all disabled:opacity-50"
                            >
                              <RefreshCw className={cn('w-3 h-3', refunding === payment.id && 'animate-spin')} />
                              Refund
                            </button>
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
