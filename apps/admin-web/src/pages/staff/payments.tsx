import { useMemo, useState } from 'react';
import Head from 'next/head';
import { format } from 'date-fns';
import { Badge, Button, Card, Input, Loading, useToast } from '@/components/ui';
import { useStaffPayoutHistory, useUpdateStaffBankDetails } from '@/hooks';
import { formatPrice } from '@/lib/utils';

export default function StaffPaymentsPage() {
  const { addToast } = useToast();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [form, setForm] = useState({
    upiId: '',
    bankAccountNo: '',
    bankIfsc: '',
    bankAccountHolder: '',
  });

  const updateBank = useUpdateStaffBankDetails();
  const { data: payoutData, isLoading } = useStaffPayoutHistory({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const payouts = useMemo(() => (Array.isArray(payoutData?.data) ? payoutData.data : []), [payoutData?.data]);

  const save = async () => {
    try {
      await updateBank.mutateAsync({
        upiId: form.upiId || undefined,
        bankAccountNo: form.bankAccountNo || undefined,
        bankIfsc: form.bankIfsc || undefined,
        bankAccountHolder: form.bankAccountHolder || undefined,
      });
      addToast({ type: 'success', title: 'Payment details updated' });
    } catch (error: any) {
      addToast({ type: 'error', title: 'Update failed', message: error?.response?.data?.message || 'Try again.' });
    }
  };

  if (isLoading) {
    return <Loading text="Loading payouts..." />;
  }

  return (
    <>
      <Head>
        <title>Payments (UPI) - Staff</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments (UPI)</h1>
          <p className="text-gray-500">Manage payout destinations and view transfer history.</p>
        </div>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Payout Destination</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="UPI ID"
              value={form.upiId}
              onChange={(e) => setForm((prev) => ({ ...prev, upiId: e.target.value }))}
              placeholder="name@bank"
            />
            <Input
              label="Bank Account Number"
              value={form.bankAccountNo}
              onChange={(e) => setForm((prev) => ({ ...prev, bankAccountNo: e.target.value }))}
            />
            <Input
              label="IFSC"
              value={form.bankIfsc}
              onChange={(e) => setForm((prev) => ({ ...prev, bankIfsc: e.target.value }))}
            />
            <Input
              label="Account Holder"
              value={form.bankAccountHolder}
              onChange={(e) => setForm((prev) => ({ ...prev, bankAccountHolder: e.target.value }))}
            />
          </div>
          <div className="mt-4">
            <Button onClick={save} isLoading={updateBank.isPending}>Save Payment Setup</Button>
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Payout History</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 rounded border border-gray-300 px-3 text-sm"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 rounded border border-gray-300 px-3 text-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs uppercase text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-gray-500">Amount</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-gray-500">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payouts.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={4}>
                      No payout records found.
                    </td>
                  </tr>
                ) : (
                  payouts.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-gray-700">{format(new Date(item.date), 'MMM d, yyyy')}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{formatPrice(Number(item.amount || 0))}</td>
                      <td className="px-4 py-3">
                        <Badge variant={item.status === 'completed' ? 'success' : 'warning'}>{item.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{item.reference || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
