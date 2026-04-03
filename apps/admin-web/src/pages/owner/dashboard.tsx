import { useMemo, useState } from 'react';
import Head from 'next/head';
import { format, formatDistanceToNow } from 'date-fns';
import { Calendar, DollarSign, TrendingUp, Users } from 'lucide-react';
import { Card, Loading, StatCard } from '@/components/ui';
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
		total: 0,
		completed: 0,
		upcoming: 0,
		inProgress: 0,
		noShow: 0,
		revenue: 0,
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

			return {
				id: member.id,
				name: member.name,
				bookings: bookingCount,
				estimatedRevenue,
			};
		});

		return staffRows.sort((a, b) => b.bookings - a.bookings).slice(0, 6);
	}, [staff, todayBookings, todayStats.revenue, todayStats.total]);

	const queueHeatmap = useMemo(() => {
		const slots = Array.from({ length: 10 }, (_, i) => 9 + i); // 09:00 - 18:00
		return slots.map((hour) => {
			const count = todayBookings.filter((booking: Booking) => {
				const dt = safeDate(booking.startTime);
				return dt ? dt.getHours() === hour : false;
			}).length;

			const utilization = todayStats.total > 0 ? Math.round((count / Math.max(todayStats.total, 1)) * 100) : 0;
			return {
				hour,
				count,
				utilization,
			};
		});
	}, [todayBookings, todayStats.total]);

	const revenueSeries = useMemo(() => {
		const tx = Array.isArray(financials?.transactions) ? financials.transactions : [];
		const groups = new Map<string, number>();

		for (const entry of tx) {
			const dt = safeDate(entry.date);
			if (!dt) continue;

			const key =
				revenueRange === 'daily'
					? format(dt, 'HH:00')
					: revenueRange === 'weekly'
						? format(dt, 'EEE')
						: format(dt, 'MMM');

			groups.set(key, (groups.get(key) || 0) + Number(entry.amount || 0));
		}

		return Array.from(groups.entries()).map(([label, amount]) => ({ label, amount }));
	}, [financials?.transactions, revenueRange]);

	const reviewsActivity = useMemo(() => {
		if (!Array.isArray(activity)) return [];
		return activity
			.filter((item: any) => String(item.type || '').toUpperCase().includes('REVIEW'))
			.slice(0, 4);
	}, [activity]);

	if (loadingDashboard || loadingBookings || loadingStaff) {
		return <Loading text="Loading owner dashboard..." />;
	}

	return (
		<>
			<Head>
				<title>Owner Dashboard - Overline Admin</title>
			</Head>

			<div className="space-y-6">
				<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<p className="text-sm font-medium text-indigo-600">Owner Console</p>
						<h1 className="text-2xl font-bold text-gray-900">Shop Dashboard</h1>
						<p className="text-sm text-gray-500">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
					</div>
					<div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
						Team online now: <span className="font-semibold">{teamSize}</span>
					</div>
				</div>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
					<StatCard
						title="Today Bookings"
						value={todayStats.total}
						icon={Calendar}
						gradient="bg-gradient-to-br from-indigo-500 to-blue-600"
					/>
					<StatCard
						title="Queue Active"
						value={todayStats.upcoming + todayStats.inProgress}
						icon={Users}
						gradient="bg-gradient-to-br from-amber-400 to-orange-500"
					/>
					<StatCard
						title="Today Revenue"
						value={formatPrice(todayStats.revenue)}
						icon={DollarSign}
						gradient="bg-gradient-to-br from-emerald-500 to-green-600"
					/>
					<StatCard
						title="Pending Settlement"
						value={formatPrice(Number(financials?.pendingSettlement || 0))}
						icon={TrendingUp}
						gradient="bg-gradient-to-br from-fuchsia-500 to-pink-500"
					/>
				</div>

				<div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
					<div className="xl:col-span-8 space-y-6">
						<Card>
							<div className="mb-4 flex items-center justify-between">
								<h2 className="text-lg font-semibold text-gray-900">Staff Performance (Today)</h2>
								<span className="text-xs text-gray-500">Top by completed workload</span>
							</div>
							<div className="overflow-x-auto">
								<table className="min-w-full text-sm">
									<thead>
										<tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
											<th className="pb-2 pr-3">Staff</th>
											<th className="pb-2 pr-3">Bookings</th>
											<th className="pb-2 pr-3">Est. Revenue</th>
										</tr>
									</thead>
									<tbody>
										{staffPerformance.length === 0 ? (
											<tr>
												<td className="py-6 text-gray-400" colSpan={3}>
													No staff activity found for today.
												</td>
											</tr>
										) : (
											staffPerformance.map((row) => (
												<tr key={row.id} className="border-b border-gray-50 last:border-0">
													<td className="py-3 pr-3 font-medium text-gray-800">{row.name}</td>
													<td className="py-3 pr-3 text-gray-700">{row.bookings}</td>
													<td className="py-3 pr-3 text-gray-700">{formatPrice(row.estimatedRevenue)}</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
						</Card>

						<Card>
							<div className="mb-4 flex items-center justify-between">
								<h2 className="text-lg font-semibold text-gray-900">Queue Utilization Heatmap</h2>
								<span className="text-xs text-gray-500">Hourly pressure view</span>
							</div>
							<div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
								{queueHeatmap.map((slot) => (
									<div
										key={slot.hour}
										className="rounded-xl border border-gray-100 p-3"
										style={{
											background:
												slot.utilization > 50
													? 'linear-gradient(180deg, #fee2e2 0%, #ffffff 100%)'
													: slot.utilization > 20
														? 'linear-gradient(180deg, #fef3c7 0%, #ffffff 100%)'
														: 'linear-gradient(180deg, #dcfce7 0%, #ffffff 100%)',
										}}
									>
										<p className="text-xs font-medium text-gray-600">{String(slot.hour).padStart(2, '0')}:00</p>
										<p className="mt-2 text-lg font-bold text-gray-900">{slot.count}</p>
										<p className="text-xs text-gray-500">{slot.utilization}% load</p>
									</div>
								))}
							</div>
						</Card>

						<Card>
							<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<h2 className="text-lg font-semibold text-gray-900">Revenue Trend</h2>
								<div className="inline-flex rounded-lg bg-gray-100 p-1 text-xs font-medium">
									{(['daily', 'weekly', 'monthly'] as RevenueRange[]).map((range) => (
										<button
											key={range}
											type="button"
											onClick={() => setRevenueRange(range)}
											className={`rounded-md px-3 py-1.5 ${
												revenueRange === range ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
											}`}
										>
											{range}
										</button>
									))}
								</div>
							</div>
							{loadingFinancials ? (
								<p className="text-sm text-gray-500">Loading revenue trend...</p>
							) : revenueSeries.length === 0 ? (
								<p className="text-sm text-gray-500">No revenue transactions found for this period.</p>
							) : (
								<div className="space-y-2">
									{revenueSeries.map((point) => (
										<div key={point.label} className="flex items-center gap-3">
											<div className="w-16 text-xs text-gray-500">{point.label}</div>
											<div className="h-2 flex-1 rounded-full bg-gray-100">
												<div
													className="h-2 rounded-full bg-indigo-500"
													style={{
														width: `${Math.max(6, Math.min(100, (point.amount / Math.max(...revenueSeries.map((p) => p.amount), 1)) * 100))}%`,
													}}
												/>
											</div>
											<div className="w-24 text-right text-xs font-semibold text-gray-700">
												{formatPrice(point.amount)}
											</div>
										</div>
									))}
								</div>
							)}
						</Card>
					</div>

					<div className="xl:col-span-4 space-y-6">
						<Card>
							<h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Reviews</h2>
							{reviewsActivity.length === 0 ? (
								<p className="text-sm text-gray-500">No review activity in the current feed.</p>
							) : (
								<div className="space-y-3">
									{reviewsActivity.map((item: any) => (
										<div key={item.id} className="rounded-lg border border-gray-100 p-3">
											<p className="text-sm font-medium text-gray-900">{item.title}</p>
											<p className="mt-1 text-xs text-gray-500">
												{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
											</p>
										</div>
									))}
								</div>
							)}
						</Card>

						<Card>
							<h2 className="mb-3 text-lg font-semibold text-gray-900">Owner Finance Snapshot</h2>
							<div className="space-y-2 text-sm">
								<div className="flex items-center justify-between">
									<span className="text-gray-500">Total Revenue</span>
									<span className="font-semibold text-gray-900">{formatPrice(Number(financials?.totalRevenue || 0))}</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-gray-500">Total Payouts</span>
									<span className="font-semibold text-gray-900">{formatPrice(Number(financials?.totalPayouts || 0))}</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-gray-500">Completed Today</span>
									<span className="font-semibold text-gray-900">{todayStats.completed}</span>
								</div>
							</div>
						</Card>
					</div>
				</div>
			</div>
		</>
	);
}
