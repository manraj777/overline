import { useMemo, useState } from 'react';
import Head from 'next/head';
import { format, startOfMonth, startOfWeek } from 'date-fns';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarDays, IndianRupee } from 'lucide-react';
import { Button, Card, Loading, StatCard } from '@/components/ui';
import { useStaffOwnBookings, useStaffOwnEarnings } from '@/hooks';
import { Booking, BookingStatus } from '@/types';
import { formatPrice } from '@/lib/utils';

type PaymentMethodFilter = 'ALL' | 'ONLINE' | 'CASH';

function getMethod(booking: Booking): 'ONLINE' | 'CASH' {
  return booking.source === 'WALK_IN' ? 'CASH' : 'ONLINE';
}

function toCsv(rows: string[][]) {
  return rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export default function StaffEarningsPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(today);
  const [method, setMethod] = useState<PaymentMethodFilter>('ALL');

  const { data: earningsData, isLoading: loadingEarnings } = useStaffOwnEarnings({ startDate, endDate, breakdown: 'daily' });
  const { data: bookingsData, isLoading: loadingBookings } = useStaffOwnBookings({ startDate, endDate, limit: 500 });

  const bookings = useMemo(() => bookingsData?.data || [], [bookingsData?.data]);

  const filteredTransactions = useMemo(() => {
    return bookings
      .filter((booking) => booking.status === BookingStatus.COMPLETED)
      .filter((booking) => (method === 'ALL' ? true : getMethod(booking) === method));
  }, [bookings, method]);

  const summary = useMemo(() => {
    const now = new Date();
    const startWeek = startOfWeek(now, { weekStartsOn: 1 });
    const startMonth = startOfMonth(now);

    const buckets = {
      today: { online: 0, cash: 0 },
      week: { online: 0, cash: 0 },
      month: { online: 0, cash: 0 },
      all: { online: 0, cash: 0 },
    };

    for (const booking of bookings) {
      if (booking.status !== BookingStatus.COMPLETED) continue;
      const amount = Number(booking.totalAmount || 0);
      const methodKey = getMethod(booking).toLowerCase() as 'online' | 'cash';
      const dt = new Date(booking.completedAt || booking.updatedAt);

      buckets.all[methodKey] += amount;
      if (format(dt, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')) buckets.today[methodKey] += amount;
      if (dt >= startWeek) buckets.week[methodKey] += amount;
      if (dt >= startMonth) buckets.month[methodKey] += amount;
    }

    return buckets;
  }, [bookings]);

  const chartData = useMemo(() => {
    const map = new Map<string, { date: string; online: number; cash: number }>();
    for (const row of filteredTransactions) {
      const date = format(new Date(row.completedAt || row.updatedAt), 'MMM d');
      if (!map.has(date)) {
        map.set(date, { date, online: 0, cash: 0 });
      }
      const entry = map.get(date)!;
      const amount = Number(row.totalAmount || 0);
      if (getMethod(row) === 'ONLINE') entry.online += amount;
      else entry.cash += amount;
    }
    return Array.from(map.values());
  }, [filteredTransactions]);

  const exportCsv = () => {
    const rows = [
      ['Date', 'Customer', 'Service', 'Amount', 'Method', 'Status'],
      ...filteredTransactions.map((item) => [
        format(new Date(item.completedAt || item.updatedAt), 'yyyy-MM-dd HH:mm'),
        item.user?.name || item.customerName || 'Walk-in',
        item.services?.[0]?.serviceName || 'Service',
        Number(item.totalAmount || 0).toFixed(2),
        getMethod(item),
        item.status,
      ]),
    ];
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `staff-earnings-${startDate}-to-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (loadingEarnings || loadingBookings) {
    return <Loading text="Loading earnings..." />;
  }

  const totals = {
    today: summary.today.online + summary.today.cash,
    week: summary.week.online + summary.week.cash,
    month: summary.month.online + summary.month.cash,
    all: summary.all.online + summary.all.cash,
  };

  return (
    <>
      <Head>
        <title>My Earnings - Staff</title>
      </Head>

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Earnings</h1>
            <p className="text-gray-500">Track daily income, payment mix, and transaction history.</p>
          </div>
          <Button onClick={exportCsv}>Export CSV</Button>
        </div>

        <Card>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase text-gray-500">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 w-full rounded border border-gray-300 px-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase text-gray-500">End date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 w-full rounded border border-gray-300 px-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase text-gray-500">Payment method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethodFilter)}
                className="h-10 w-full rounded border border-gray-300 px-3 text-sm"
              >
                <option value="ALL">All</option>
                <option value="ONLINE">Online</option>
                <option value="CASH">Cash</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
                  setEndDate(today);
                  setMethod('ALL');
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title={`Today (O ${formatPrice(summary.today.online)} | C ${formatPrice(summary.today.cash)})`}
            value={formatPrice(totals.today)}
            icon={IndianRupee}
            gradient="bg-gradient-to-br from-cyan-500 to-sky-600"
          />
          <StatCard
            title={`This Week (O ${formatPrice(summary.week.online)} | C ${formatPrice(summary.week.cash)})`}
            value={formatPrice(totals.week)}
            icon={CalendarDays}
            gradient="bg-gradient-to-br from-indigo-500 to-violet-600"
          />
          <StatCard
            title={`This Month (O ${formatPrice(summary.month.online)} | C ${formatPrice(summary.month.cash)})`}
            value={formatPrice(totals.month)}
            icon={IndianRupee}
            gradient="bg-gradient-to-br from-emerald-500 to-green-600"
          />
          <StatCard
            title={`All Time (O ${formatPrice(summary.all.online)} | C ${formatPrice(summary.all.cash)})`}
            value={formatPrice(totals.all)}
            icon={IndianRupee}
            gradient="bg-gradient-to-br from-amber-500 to-orange-600"
          />
        </div>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Daily earnings (online vs cash)</h2>
          {chartData.length === 0 ? (
            <p className="text-sm text-gray-500">No completed transactions in selected range.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatPrice(Number(value || 0))} />
                  <Legend />
                  <Bar dataKey="online" stackId="a" fill="#4f46e5" name="Online" />
                  <Bar dataKey="cash" stackId="a" fill="#f59e0b" name="Cash" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs uppercase text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-gray-500">Customer</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-gray-500">Service</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-gray-500">Amount</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-gray-500">Method</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={6}>
                      No transactions for selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((item) => {
                    const paymentMethod = getMethod(item);
                    return (
                      <tr key={item.id} className={paymentMethod === 'CASH' ? 'bg-amber-50/50' : 'bg-indigo-50/30'}>
                        <td className="px-4 py-3 text-gray-800">{format(new Date(item.completedAt || item.updatedAt), 'MMM d, HH:mm')}</td>
                        <td className="px-4 py-3 text-gray-800">{item.user?.name || item.customerName || 'Walk-in'}</td>
                        <td className="px-4 py-3 text-gray-700">{item.services?.[0]?.serviceName || 'Service'}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{formatPrice(Number(item.totalAmount || 0))}</td>
                        <td className="px-4 py-3 text-gray-700">{paymentMethod}</td>
                        <td className="px-4 py-3 text-gray-700">{item.status}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-gray-900">API summary snapshot</h2>
          <p className="mt-2 text-sm text-gray-600">
            Earnings API total: {formatPrice(Number(earningsData?.totalEarnings || 0))} · Pending payment:{' '}
            {formatPrice(Number(earningsData?.pendingPayment || 0))}
          </p>
        </Card>
      </div>
    </>
  );
}
