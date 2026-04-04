import { useMemo, useState } from 'react';
import Head from 'next/head';
import { format, formatDistanceToNow } from 'date-fns';
import { Calendar, DollarSign, TrendingUp, Users } from 'lucide-react';
import { Loading } from '@/components/ui';
import {
	useAdminBookings,
	useDashboard,
	useOwnerFinancials,
	useRecentActivity,
	useStaff,
} from '@/hooks';
import { formatPrice } from '@/lib/utils';
import { Booking, Staff } from '@/types';

type RevenueRange = 'daily' | 'weekly' | 'monthly';

function safeDate(raw: string | undefined): Date | null {
	if (!raw) return null;
	const parsed = new Date(raw);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function OwnerDashboardPage() {
	const [revenueRange, setRevenueRange] = useState<RevenueRange>('weekly');

	const { data: dashboard, isLoading: loadingDashboard } = useDashboard();
	const { data: bookingsPage, isLoading: loadingBookings } = useAdminBookings({
		date: format(new Date(), 'yyyy-MM-dd'),
		limit: 100,
	});
	const { data: staff, isLoading: loadingStaff } = useStaff();
	const { data: activity } = useRecentActivity();
	const { data: financials, isLoading: loadingFinancials } = useOwnerFinancials({
		breakdown: revenueRange,
	});

	const todayStats = dashboard?.todayStats || {
		total: 0, completed: 0, upcoming: 0, inProgress: 0, noShow: 0, revenue: 0,
	};

	const todayBookings = useMemo(() => bookingsPage?.data || [], [bookingsPage?.data]);
	const teamSize = staff?.length || 0;

	const staffPerformance = useMemo(() => {
		const bookingsByStaff = new Map<string, number>();
		for (const booking of todayBookings) {
			const key = booking.staffId || 'unassigned';
			bookingsByStaff.set(key, (bookingsByStaff.get(key) || 0) + 1);
		}
		const staffRows = (staff || []).map((member: Staff) => {
			const bookingCount = bookingsByStaff.get(member.id) || 0;
			const estimatedRevenue = bookingCount * (todayStats.total > 0 ? todayStats.revenue / todayStats.total : 0);
			return { id: member.id, name: member.name, bookings: bookingCount, estimatedRevenue };
		});
		return staffRows.sort((a, b) => b.bookings - a.bookings).slice(0, 6);
	}, [staff, todayBookings, todayStats.revenue, todayStats.total]);

	const queueHeatmap = useMemo(() => {
		const slots = Array.from({ length: 10 }, (_, i) => 9 + i);
		return slots.map((hour) => {
			const count = todayBookings.filter((booking: Booking) => {
				const dt = safeDate(booking.startTime);
				return dt ? dt.getHours() === hour : false;
			}).length;
			const utilization = todayStats.total > 0 ? Math.round((count / Math.max(todayStats.total, 1)) * 100) : 0;
			return { hour, count, utilization };
		});
	}, [todayBookings, todayStats.total]);

	const revenueSeries = useMemo(() => {
		const tx = Array.isArray(financials?.transactions) ? financials.transactions : [];
		const groups = new Map<string, number>();
		for (const entry of tx) {
			const dt = safeDate(entry.date);
			if (!dt) continue;
			const key = revenueRange === 'daily' ? format(dt, 'HH:00') : revenueRange === 'weekly' ? format(dt, 'EEE') : format(dt, 'MMM');
			groups.set(key, (groups.get(key) || 0) + Number(entry.amount || 0));
		}
		return Array.from(groups.entries()).map(([label, amount]) => ({ label, amount }));
	}, [financials?.transactions, revenueRange]);

	const reviewsActivity = useMemo(() => {
		if (!Array.isArray(activity)) return [];
		return activity.filter((item: any) => String(item.type || '').toUpperCase().includes('REVIEW')).slice(0, 4);
	}, [activity]);

	if (loadingDashboard || loadingBookings || loadingStaff) {
		return <Loading text="Loading owner dashboard..." />;
	}

	const metricCards = [
		{ label: 'Today Bookings', value: String(todayStats.total), icon: Calendar, color: 'text-primary', bgColor: 'bg-primary-fixed' },
		{ label: 'Queue Active', value: String(todayStats.upcoming + todayStats.inProgress), icon: Users, color: 'text-secondary', bgColor: 'bg-secondary-fixed' },
		{ label: 'Today Revenue', value: formatPrice(todayStats.revenue), icon: DollarSign, color: 'text-tertiary', bgColor: 'bg-tertiary-fixed' },
		{ label: 'Pending Settlement', value: formatPrice(Number(financials?.pendingSettlement || 0)), icon: TrendingUp, color: 'text-on-surface', bgColor: 'bg-surface-container-low' },
	];

	return (
		<>
			<Head>
				<title>Owner Dashboard — Overline Admin</title>
				<meta name="description" content="Owner console dashboard for managing your Overline shop." />
			</Head>

			<div className="space-y-6">
				<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<span className="label-m3 mb-2 block">Owner Console</span>
						<h1 className="text-3xl font-black tracking-tight text-on-surface">Shop Dashboard</h1>
						<p className="text-on-surface-variant text-sm mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
					</div>
					<div className="badge-m3 bg-primary-fixed text-primary px-4 py-2.5">
						Team online now: <span className="font-black">{teamSize}</span>
					</div>
				</div>

				{/* Metric Cards */}
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
					{metricCards.map((metric) => (
						<div key={metric.label} className="card-m3 p-6">
							<div className="flex items-start justify-between mb-4">
								<div className={`w-10 h-10 rounded-xl ${metric.bgColor} flex items-center justify-center`}>
									<metric.icon className={`w-5 h-5 ${metric.color}`} />
								</div>
							</div>
							<p className="metric-value">{metric.value}</p>
							<p className="metric-label mt-1">{metric.label}</p>
						</div>
					))}
				</div>

				<div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
					<div className="xl:col-span-8 space-y-6">
						{/* Staff Performance */}
						<div className="card-m3 p-6">
							<div className="mb-5 flex items-center justify-between">
								<h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
									<div className="w-1.5 h-6 bg-primary rounded-full" />
									Staff Performance (Today)
								</h2>
								<span className="text-[10px] font-bold text-outline tracking-widest uppercase">Top by workload</span>
							</div>
							<table className="table-m3">
								<thead>
									<tr>
										<th>Staff</th>
										<th>Bookings</th>
										<th>Est. Revenue</th>
									</tr>
								</thead>
								<tbody>
									{staffPerformance.length === 0 ? (
										<tr><td className="text-on-surface-variant" colSpan={3}>No staff activity found for today.</td></tr>
									) : (
										staffPerformance.map((row) => (
											<tr key={row.id}>
												<td><span className="font-bold">{row.name}</span></td>
												<td className="text-on-surface-variant">{row.bookings}</td>
												<td><span className="font-bold">{formatPrice(row.estimatedRevenue)}</span></td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>

						{/* Queue Heatmap */}
						<div className="card-m3 p-6">
							<div className="mb-5 flex items-center justify-between">
								<h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
									<div className="w-1.5 h-6 bg-secondary rounded-full" />
									Queue Utilization Heatmap
								</h2>
								<span className="text-[10px] font-bold text-outline tracking-widest uppercase">Hourly pressure</span>
							</div>
							<div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
								{queueHeatmap.map((slot) => (
									<div
										key={slot.hour}
										className="rounded-2xl border border-outline-variant/10 p-3.5"
										style={{
											background:
												slot.utilization > 50
													? 'linear-gradient(180deg, rgba(186,26,26,0.08) 0%, rgba(248,249,255,1) 100%)'
													: slot.utilization > 20
														? 'linear-gradient(180deg, rgba(245,158,11,0.08) 0%, rgba(248,249,255,1) 100%)'
														: 'linear-gradient(180deg, rgba(0,110,68,0.08) 0%, rgba(248,249,255,1) 100%)',
										}}
									>
										<p className="text-[10px] font-bold text-outline">{String(slot.hour).padStart(2, '0')}:00</p>
										<p className="mt-2 text-xl font-black text-on-surface">{slot.count}</p>
										<p className="text-[10px] text-on-surface-variant font-medium">{slot.utilization}% load</p>
									</div>
								))}
							</div>
						</div>

						{/* Revenue Trend */}
						<div className="card-m3 p-6">
							<div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
									<div className="w-1.5 h-6 bg-tertiary rounded-full" />
									Revenue Trend
								</h2>
								<div className="inline-flex rounded-xl bg-surface-container-low p-1 text-xs font-bold border border-outline-variant/10">
									{(['daily', 'weekly', 'monthly'] as RevenueRange[]).map((range) => (
										<button
											key={range}
											type="button"
											onClick={() => setRevenueRange(range)}
											className={`rounded-lg px-3 py-1.5 transition-all ${
												revenueRange === range ? 'bg-primary text-white shadow-button' : 'text-on-surface-variant'
											}`}
										>
											{range}
										</button>
									))}
								</div>
							</div>
							{loadingFinancials ? (
								<p className="text-sm text-on-surface-variant">Loading revenue trend...</p>
							) : revenueSeries.length === 0 ? (
								<p className="text-sm text-on-surface-variant">No revenue transactions found for this period.</p>
							) : (
								<div className="space-y-2">
									{revenueSeries.map((point) => (
										<div key={point.label} className="flex items-center gap-3">
											<div className="w-16 text-[10px] font-bold text-outline">{point.label}</div>
											<div className="h-2 flex-1 rounded-full bg-surface-container-low">
												<div
													className="h-2 rounded-full bg-primary transition-all"
													style={{
														width: `${Math.max(6, Math.min(100, (point.amount / Math.max(...revenueSeries.map((p) => p.amount), 1)) * 100))}%`,
													}}
												/>
											</div>
											<div className="w-24 text-right text-xs font-bold text-on-surface">
												{formatPrice(point.amount)}
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>

					{/* Sidebar */}
					<div className="xl:col-span-4 space-y-6">
						<div className="card-m3 p-6">
							<h2 className="mb-4 text-sm font-bold text-on-surface">Recent Reviews</h2>
							{reviewsActivity.length === 0 ? (
								<p className="text-xs text-on-surface-variant">No review activity in the current feed.</p>
							) : (
								<div className="space-y-3">
									{reviewsActivity.map((item: any) => (
										<div key={item.id} className="rounded-xl border border-outline-variant/10 p-3 hover:bg-surface-container-low transition-colors">
											<p className="text-sm font-medium text-on-surface">{item.title}</p>
											<p className="mt-1 text-[10px] text-outline font-bold">
												{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
											</p>
										</div>
									))}
								</div>
							)}
						</div>

						<div className="card-m3 p-6">
							<h2 className="mb-4 text-sm font-bold text-on-surface">Owner Finance Snapshot</h2>
							<div className="space-y-3">
								{[
									{ label: 'Total Revenue', value: formatPrice(Number(financials?.totalRevenue || 0)) },
									{ label: 'Total Payouts', value: formatPrice(Number(financials?.totalPayouts || 0)) },
									{ label: 'Completed Today', value: String(todayStats.completed) },
								].map((item) => (
									<div key={item.label} className="flex items-center justify-between text-sm">
										<span className="text-on-surface-variant text-xs font-medium">{item.label}</span>
										<span className="font-bold text-on-surface">{item.value}</span>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
