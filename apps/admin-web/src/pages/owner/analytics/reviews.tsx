import Head from 'next/head';
import { Card } from '@/components/ui';

export default function OwnerReviewsAnalyticsPage() {
  return (
    <>
      <Head>
        <title>Reviews - Owner Analytics</title>
      </Head>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Reviews Analytics</h1>
        <Card>
          <p className="text-sm text-gray-600">Recent reviews and staff-level breakdown will appear here.</p>
        </Card>
      </div>
    </>
  );
}
