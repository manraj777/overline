import Head from 'next/head';
import { Card } from '@/components/ui';

export default function OwnerStaffEarningsPage() {
  return (
    <>
      <Head>
        <title>Staff Earnings - Owner</title>
      </Head>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Staff Earnings</h1>
        <Card>
          <p className="text-sm text-gray-600">
            Staff earnings analytics is available in this phase via owner APIs and will be expanded with
            detailed filters and charts in the next UI pass.
          </p>
        </Card>
      </div>
    </>
  );
}
