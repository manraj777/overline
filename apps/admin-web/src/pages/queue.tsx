import React from 'react';
import Head from 'next/head';
import QueueBoard from '@/components/QueueBoard';

export default function QueuePage() {
  return (
    <>
      <Head>
        <title>Queue - Overline Admin</title>
      </Head>

      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Queue</h1>
          <p className="text-gray-500">Manage live queue flow and customer lifecycle.</p>
        </div>

        <QueueBoard />
      </div>
    </>
  );
}
