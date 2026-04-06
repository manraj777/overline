import { useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { format, formatDistanceToNow, isSameDay } from 'date-fns';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertTriangle, Calendar, IndianRupee, Star, UserCheck } from 'lucide-react';
import { Badge, Button, Card, Loading, StatCard } from '@/components/ui';
import {
	useStaffOwnBookings,
	useStaffOwnEarnings,
	useStaffOwnSchedule,
	useUpdateStaffOwnBookingStatus,
	useShopSettings,
} from '@/hooks';
import { Booking, BookingStatus } from '@/types';
import { formatPrice, formatTime } from '@/lib/utils';

const DONUT_COLORS = ['#4648d4', '#f59e0b'];

const PENDING_STATUSES: BookingStatus[] = [
	BookingStatus.PENDING,
	BookingStatus.PENDING_APPROVAL,
	BookingStatus.WAITLISTED,
];

export default function StaffDashboardPage() {
	const today = format(new Date(), 'yyyy-MM-dd');
	const { data: bookingsData, isLoading: loadingBookings } = useStaffOwnBookings({
		date: today,
		limit: 100,
	});
	const { data: earningsData, isLoading: loadingEarnings } = useStaffOwnEarnings({
		startDate: today,
		endDate: today,
		breakdown: 'daily',
	});
	const { data: scheduleData } = useStaffOwnSchedule();
	const { data: shopData } = useShopSettings();
	const updateBooking = useUpdateStaffOwnBookingStatus();

	const bookings = useMemo(() => bookingsData?.data || [], [bookingsData?.data]);
	const pendingBookings = bookings.filter((booking) => PENDING_STATUSES.includes(booking.status));
	const pendingTimeOff = (scheduleData?.timeOffs || []).filter((item) => item.status === 'pending');

	const timelineItems = useMemo(
		() =>
			bookings
				.filter((booking) =>
					[BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS, BookingStatus.IN_SERVICE, BookingStatus.COMPLETED].includes(
						booking.status,
					),
				)
				.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
		[bookings],
	);

	const earningsSplit = useMemo(() => {
		const completed = bookings.filter((booking) => booking.status === BookingStatus.COMPLETED);
		let online = 0;
		let cash = 0;
		for (const booking of completed) {
			const amount = Number(booking.totalAmount || 0);
			if (booking.source === 'WALK_IN') { cash += amount; } else { online += amount; }
		}
		return [
			{ name: 'Online', value: online },
			{ name: 'Cash', value: cash },
		];
	}, [bookings]);

	const recentEarnings = useMemo(
		() =>
			bookings
				.filter((booking) => booking.status === BookingStatus.COMPLETED)
				.sort((a, b) => new Date(b.completedAt || b.updatedAt).getTime() - new Date(a.completedAt || a.updatedAt).getTime())
				.slice(0, 5),
		[bookings],
	);

	const totalEarnings = Number(earningsData?.totalEarnings || 0);
	const myRating = 4.9;

	if (loadingBookings || loadingEarnings) {
		return <Loading text="Loading staff dashboard..." />;
	}

	const metricCards = [
		{ label: 'My earnings today', value: formatPrice(totalEarnings), icon: IndianRupee, color: 'text-tertiary', bgColor: 'bg-tertiary-fixed' },
		{ label: 'My bookings today', value: String(bookings.length), icon: Calendar, color: 'text-primary', bgColor: 'bg-primary-fixed' },
		{ label: 'Pending approvals', value: String(pendingBookings.length + pendingTimeOff.length), icon: AlertTriangle, color: 'text-amber-600', bgColor: 'bg-amber-100' },
		{ label: 'My rating', value: `${myRating.toFixed(1)}★`, icon: Star, color: 'text-secondary', bgColor: 'bg-secondary-fixed' },
	];

	return (
		<>
			<Head>
				<title>My Dashboard — Staff</title>
				<meta name="description" content="Staff personal dashboard for Overline." />
			</Head>

			<div className="space-y-6">
				<div className="card-m3 overflow-hidden">
					<div
						className="h-40 w-full bg-cover bg-center"
						style={{
							backgroundImage: `url(${shopData?.coverPhotoUrl || shopData?.logoUrl || 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?q=80&w=1600'})`,
						}}
					/>
					<div className="p-5">
						<p className="label-m3 mb-1">Assigned Shop</p>
						<h2 className="text-xl font-black text-on-surface">{shopData?.name || 'Your Shop'}</h2>
						<p className="text-sm text-on-surface-variant mt-1">{shopData?.address || 'Shop location will appear here'}</p>
					</div>
				</div>

				<div>
					<span className="label-m3 mb-2 block">My Day</span>
					<h1 className="text-3xl font-black tracking-tight text-on-surface">Staff Dashboard</h1>
					<p className="text-on-surface-variant text-sm mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
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
						{/* Pending Approvals */}
						{pendingBookings.length > 0 && (
							<div className="card-m3 p-6">
								<div className="mb-5 flex items-center justify-between">
									<h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
										<div className="w-1.5 h-6 bg-amber-500 rounded-full" />
										Pending approvals
									</h2>
									<span className="badge-m3 bg-amber-100 text-amber-700">Urgent</span>
								</div>

								<div className="space-y-3">
									{pendingBookings.slice(0, 3).map((booking) => (
										<div key={booking.id} className="rounded-2xl border border-amber-200/50 bg-amber-50/50 p-4">
											<p className="font-bold text-on-surface text-sm">
												{booking.user?.name || booking.customerName || 'Walk-in'} · {booking.services?.[0]?.serviceName || 'Service'} ·{' '}
												{formatTime(booking.startTime)} · {formatPrice(Number(booking.totalAmount || 0))}
											</p>
											<p className="mt-1 text-xs text-on-surface-variant">
												{booking.source === 'WALK_IN' ? 'Cash booking' : 'Online payment'} · Token #{booking.bookingNumber}
											</p>
											<p className="mt-1 text-[10px] text-outline font-bold">
												Requested {formatDistanceToNow(new Date(booking.createdAt), { addSuffix: true })}
											</p>
											<div className="mt-3 flex flex-wrap gap-2">
												<button
													onClick={() => updateBooking.mutate({ bookingId: booking.id, status: BookingStatus.CONFIRMED })}
													disabled={updateBooking.isPending}
													className="btn-primary px-4 py-1.5 text-xs disabled:opacity-50"
												>
													Approve
												</button>
												<button
													onClick={() => updateBooking.mutate({ bookingId: booking.id, status: BookingStatus.CANCELLED })}
													disabled={updateBooking.isPending}
													className="btn-tonal px-4 py-1.5 text-xs disabled:opacity-50"
												>
													Reject
												</button>
												<Link href="/staff/profile" className="text-primary text-xs font-bold hover:underline self-center ml-1">
													View profile
												</Link>
											</div>
										</div>
									))}
								</div>

								{(pendingBookings.length + pendingTimeOff.length) > 3 && (
									<Link href="/staff/bookings" className="mt-4 inline-block text-xs font-bold text-primary hover:underline">
										See all {pendingBookings.length + pendingTimeOff.length} pending →
									</Link>
								)}
							</div>
						)}

						{/* Timeline */}
						<div className="card-m3 p-6">
							<h2 className="mb-5 text-sm font-bold text-on-surface flex items-center gap-2">
								<div className="w-1.5 h-6 bg-primary rounded-full" />
								Today&apos;s timeline
							</h2>
							{timelineItems.length === 0 ? (
								<p className="text-sm text-on-surface-variant">No confirmed bookings in your timeline today.</p>
							) : (
								<div className="relative space-y-2 border-l-2 border-outline-variant/15 pl-4">
									{timelineItems.map((item) => {
										const itemDate = new Date(item.startTime);
										const now = new Date();
										const isCurrent = isSameDay(itemDate, now) && itemDate <= now;

										return (
											<div
												key={item.id}
												className="w-full rounded-xl border border-outline-variant/10 p-3.5 hover:bg-surface-container-low transition-colors"
											>
												<div className="flex items-start justify-between gap-3">
													<div>
														<p className="text-sm font-bold text-on-surface">
															{formatTime(item.startTime)} | {item.user?.name || item.customerName || 'Walk-in'}
														</p>
														<p className="text-xs text-on-surface-variant mt-0.5">{item.services?.[0]?.serviceName || 'Service'}</p>
													</div>
													<span className={`mt-1 h-2.5 w-2.5 rounded-full ${isCurrent ? 'bg-error' : 'bg-tertiary'}`} />
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					</div>

					{/* Sidebar */}
					<div className="xl:col-span-4 space-y-6">
						{/* Earnings Donut */}
						<div className="card-m3 p-6">
							<h2 className="mb-4 text-sm font-bold text-on-surface">My earnings today</h2>
							<div className="h-52">
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie data={earningsSplit} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={4}>
											{earningsSplit.map((_, idx) => (
												<Cell key={idx} fill={DONUT_COLORS[idx]} />
											))}
										</Pie>
										<Tooltip formatter={(value) => formatPrice(Number(value || 0))} />
									</PieChart>
								</ResponsiveContainer>
							</div>
							<p className="-mt-4 mb-3 text-center text-sm font-black text-on-surface">Total {formatPrice(totalEarnings)}</p>

							<div className="space-y-2 pt-3 border-t border-outline-variant/10">
								{recentEarnings.length === 0 ? (
									<p className="text-xs text-on-surface-variant">No completed bookings yet.</p>
								) : (
									recentEarnings.map((entry: Booking) => (
										<div key={entry.id} className="flex items-center justify-between text-sm">
											<div>
												<p className="font-medium text-on-surface text-xs">{entry.user?.name || entry.customerName || 'Walk-in'}</p>
												<p className="text-[10px] text-outline">{entry.services?.[0]?.serviceName || 'Service'}</p>
											</div>
											<p className="font-bold text-on-surface text-sm">{formatPrice(Number(entry.totalAmount || 0))}</p>
										</div>
									))
								)}
							</div>
						</div>

						{/* Approval Snapshot */}
						<div className="card-m3 p-6">
							<h2 className="mb-4 text-sm font-bold text-on-surface">Approval snapshot</h2>
							<div className="space-y-3">
								{[
									{ label: 'Booking approvals', value: pendingBookings.length },
									{ label: 'Time-off requests pending', value: pendingTimeOff.length },
									{ label: 'Next confirmed booking', value: timelineItems[0] ? formatTime(timelineItems[0].startTime) : '-' },
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
