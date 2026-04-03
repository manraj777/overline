import Head from 'next/head';
import { useRouter } from 'next/router';
import { Card } from '@/components/ui';

export default function OwnerStaffDetailPage() {
  const router = useRouter();
  const staffId = typeof router.query.id === 'string' ? router.query.id : '';

  return (
    <>
      <Head>
        <title>Staff Detail - Owner</title>
      </Head>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Staff Detail</h1>
        <Card>
          <p className="text-sm text-gray-600">Staff ID: {staffId || 'Loading...'}</p>
        </Card>
      </div>
    </>
  );
}
