import Head from 'next/head';
import { Card, StatCard } from '@/components/ui';
import { TrendingUp, Users, Store, DollarSign, Activity, Target, Megaphone, Eye, MousePointerClick, CheckCircle2 } from 'lucide-react';
import React from 'react';

// Mocked superadmin metrics
const platformMetrics = {
  totalShops: 42,
  totalUsers: 1250,
  activeBookings: 890,
  platformGmv: 450000,
};

const adCampaigns = [
  {
    id: 1,
    name: 'Instagram Retargeting - City Level',
    status: 'ACTIVE',
    spend: 12500,
    impressions: 45000,
    clicks: 1200,
    conversions: 85,
    cpa: 147,
  },
  {
    id: 2,
    name: 'Google Search - "Salons near me"',
    status: 'ACTIVE',
    spend: 34000,
    impressions: 120000,
    clicks: 8500,
    conversions: 320,
    cpa: 106,
  },
  {
    id: 3,
    name: 'Facebook Lookalike - Top Users',
    status: 'PAUSED',
    spend: 8000,
    impressions: 22000,
    clicks: 400,
    conversions: 12,
    cpa: 666,
  }
];

export default function PlatformDashboardPage() {
  return (
    <>
      <Head>
        <title>Startup Launch | Overline Admin</title>
      </Head>
      
      <div className="space-y-8 animate-fade-in pb-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Startup Launch Center</h1>
            <p className="text-gray-500 mt-1">Superadmin overview of platform growth, investment metrics, and active marketing campaigns.</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold border border-emerald-200 shadow-sm">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            System Online
          </div>
        </div>

        {/* Executive Summary */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Platform GMV"
            value={`₹${platformMetrics.platformGmv.toLocaleString()}`}
            icon={DollarSign}
          />
          <StatCard
            title="Total Active Shops"
            value={platformMetrics.totalShops.toString()}
            icon={Store}
          />
          <StatCard
            title="Total Registered Users"
            value={platformMetrics.totalUsers.toString()}
            icon={Users}
          />
          <StatCard
            title="Total Bookings (All Time)"
            value={platformMetrics.activeBookings.toString()}
            icon={Activity}
          />
        </div>

        {/* Marketing & Ads Tracking */}
        <div className="mt-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">Marketing & Ads Tracker</h2>
              <p className="text-sm text-gray-500">Monitor active campaigns across ad networks.</p>
            </div>
          </div>

          <Card className="overflow-hidden p-0 border-gray-200/60 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4">Campaign Name</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Spend</th>
                    <th className="px-6 py-4">Impressions</th>
                    <th className="px-6 py-4">Clicks</th>
                    <th className="px-6 py-4">Conversions</th>
                    <th className="px-6 py-4 text-right">CPA (Cost Per Acq.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {adCampaigns.map((ad) => (
                    <tr key={ad.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900">{ad.name}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          ad.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {ad.status === 'ACTIVE' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                          {ad.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium">₹{ad.spend.toLocaleString()}</td>
                      <td className="px-6 py-4 text-gray-600 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-gray-400" /> {ad.impressions.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <MousePointerClick className="w-3.5 h-3.5 text-gray-400" /> {ad.clicks.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 font-bold text-gray-900">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {ad.conversions}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-black ${ad.cpa > 300 ? 'text-red-500' : 'text-emerald-600'}`}>
                          ₹{ad.cpa}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
        
        {/* Investment/Growth Metrics (Placeholder) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Card className="border-gray-200/60 shadow-sm p-6">
            <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-500" /> Key Startup KPIs
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Customer Acquisition Cost (CAC)</span>
                <span className="font-bold text-gray-900">~₹140.00</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Est. Lifetime Value (LTV)</span>
                <span className="font-bold text-emerald-600">₹2,450.00</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-gray-600 font-medium">LTV:CAC Ratio</span>
                <span className="font-bold text-gray-900">17.5x <span className="text-xs text-emerald-500 bg-emerald-100 px-2 py-0.5 rounded-md ml-2">Excellent</span></span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">MoM Shop Growth</span>
                <span className="font-bold text-gray-900">+12%</span>
              </div>
            </div>
          </Card>
          
          <Card className="border-gray-200/60 shadow-sm p-6 bg-gradient-to-br from-indigo-900 to-slate-900 text-white">
            <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" /> Pitch Deck Highlights
            </h3>
            <p className="text-indigo-100/80 text-sm mb-6 leading-relaxed">
              These talking points are automatically derived from platform metrics to assist with investor pitches and marketing communications.
            </p>
            <ul className="space-y-3">
              <li className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                <p className="text-sm font-medium">Zero-to-{platformMetrics.totalUsers} users acquired primarily through organic and direct WhatsApp sharing loops.</p>
              </li>
              <li className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                <p className="text-sm font-medium">High retention LTV:CAC ratio demonstrates clear product-market fit for localized shop booking.</p>
              </li>
              <li className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                <p className="text-sm font-medium">Over ₹{platformMetrics.platformGmv.toLocaleString()} in GMV processed, validating the transaction volume of the multi-tenant model.</p>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
