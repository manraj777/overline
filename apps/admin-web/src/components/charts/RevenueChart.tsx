import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Bar,
} from 'recharts';

interface DataPoint {
  date: string;
  totalRevenue: number;
  totalBookings: number;
  completedBookings: number;
}

interface RevenueChartProps {
  data: DataPoint[];
  isLoading?: boolean;
}

const formatCurrency = (val: number) =>
  `₹${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg p-3 min-w-[180px]">
      <p className="text-xs font-medium text-gray-500 mb-2">{label}</p>
      {payload.map((item: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4 mb-1 last:mb-0">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-gray-600">{item.name}</span>
          </div>
          <span className="text-xs font-semibold text-gray-900">
            {item.name === 'Revenue' ? `₹${item.value.toLocaleString()}` : item.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export function RevenueChart({ data, isLoading }: RevenueChartProps) {
  const [range, setRange] = React.useState<'7d' | '30d' | '90d'>('7d');

  const filteredData = React.useMemo(() => {
    if (!data?.length) return [];
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    return data.slice(-days).map((d) => ({
      ...d,
      label: new Date(d.date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      }),
    }));
  }, [data, range]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-5 w-40 bg-gray-200 rounded mb-6" />
          <div className="h-[280px] bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Revenue Overview</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {filteredData.length > 0
              ? `₹${filteredData.reduce((s, d) => s + d.totalRevenue, 0).toLocaleString()} total`
              : 'No data available'}
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['7d', '30d', '90d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                range === r
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {filteredData.length === 0 ? (
        <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">
          No revenue data for selected period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={filteredData}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCurrency}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="totalRevenue"
              name="Revenue"
              stroke="#6366f1"
              strokeWidth={2.5}
              fill="url(#revenueGradient)"
            />
            <Bar
              yAxisId="right"
              dataKey="totalBookings"
              name="Bookings"
              fill="#e0e7ff"
              radius={[4, 4, 0, 0]}
              barSize={16}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
