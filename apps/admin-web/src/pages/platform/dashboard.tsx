import Head from 'next/head';
import { Card } from '@/components/ui';

export default function PlatformDashboardPage() {
  return (
    <>
      <Head>
        <title>Platform Dashboard</title>
      </Head>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Platform Dashboard</h1>
        <Card>
          <p className="text-sm text-gray-600">
            Super admin platform controls are routed correctly and this page is ready for platform module implementation.
          </p>
        </Card>
      </div>
    </>
  );
}
