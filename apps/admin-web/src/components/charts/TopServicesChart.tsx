import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ServiceData {
  serviceId: string;
  serviceName: string;
  bookingCount: number;
  revenue: number;
}

interface TopServicesChartProps {
  data: ServiceData[];
  isLoading?: boolean;
}

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg p-3">
      <p className="text-sm font-semibold text-gray-900 mb-1">{d.serviceName}</p>
      <p className="text-xs text-gray-500">{d.bookingCount} bookings · ₹{Number(d.revenue).toLocaleString()} revenue</p>
    </div>
  );
};

export function TopServicesChart({ data, isLoading }: TopServicesChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const chartData = (data || []).slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 h-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Services</h3>
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">
          No service data yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="serviceName"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              width={100}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="bookingCount" name="Bookings" radius={[0, 6, 6, 0]} barSize={20}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
