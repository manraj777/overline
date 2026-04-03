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
} from '@/hooks';
import { Booking, BookingStatus } from '@/types';
import { formatPrice, formatTime } from '@/lib/utils';

const DONUT_COLORS = ['#4338ca', '#f59e0b'];

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
			if (booking.source === 'WALK_IN') {
				cash += amount;
			} else {
				online += amount;
			}
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

	return (
		<>
			<Head>
				<title>My Dashboard - Staff</title>
			</Head>

			<div className="space-y-6">
				<div>
					<p className="text-sm font-medium text-[#0f4c75]">My Day</p>
					<h1 className="text-2xl font-bold text-gray-900">Staff Dashboard</h1>
					<p className="text-gray-500">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
				</div>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
					<StatCard
						title="My earnings today"
						value={formatPrice(totalEarnings)}
						icon={IndianRupee}
						gradient="bg-gradient-to-br from-cyan-600 to-sky-700"
					/>
					<StatCard
						title="My bookings today"
						value={bookings.length}
						icon={Calendar}
						gradient="bg-gradient-to-br from-teal-500 to-cyan-600"
					/>
					<StatCard
						title="Pending approvals"
						value={pendingBookings.length + pendingTimeOff.length}
						icon={AlertTriangle}
						gradient="bg-gradient-to-br from-amber-500 to-orange-600"
					/>
					<StatCard
						title="My rating"
						value={`${myRating.toFixed(1)}★`}
						icon={Star}
						gradient="bg-gradient-to-br from-indigo-500 to-violet-600"
					/>
				</div>

				<div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
					<div className="xl:col-span-8 space-y-6">
						{pendingBookings.length > 0 && (
							<Card>
								<div className="mb-4 flex items-center justify-between">
									<h2 className="text-lg font-semibold text-gray-900">Pending approvals</h2>
									<Badge variant="warning">Urgent</Badge>
								</div>

								<div className="space-y-3">
									{pendingBookings.slice(0, 3).map((booking) => (
										<div key={booking.id} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
											<p className="font-semibold text-gray-900">
												{booking.user?.name || booking.customerName || 'Walk-in'} · {booking.services?.[0]?.serviceName || 'Service'} ·{' '}
												{formatTime(booking.startTime)} · {formatPrice(Number(booking.totalAmount || 0))}
											</p>
											<p className="mt-1 text-sm text-gray-600">
												{booking.source === 'WALK_IN' ? 'Cash booking' : 'Online payment'} · Token #{booking.bookingNumber}
											</p>
											<p className="mt-1 text-xs text-gray-500">
												Requested {formatDistanceToNow(new Date(booking.createdAt), { addSuffix: true })}
											</p>
											<div className="mt-3 flex flex-wrap gap-2">
												<Button
													size="sm"
													onClick={() => updateBooking.mutate({ bookingId: booking.id, status: BookingStatus.CONFIRMED })}
													isLoading={updateBooking.isPending}
												>
													Approve
												</Button>
												<Button
													size="sm"
													variant="outline"
													onClick={() => updateBooking.mutate({ bookingId: booking.id, status: BookingStatus.CANCELLED })}
													isLoading={updateBooking.isPending}
												>
													Reject
												</Button>
												<Link href="/staff/profile">
													<Button size="sm" variant="ghost">
														View profile
													</Button>
												</Link>
											</div>
										</div>
									))}
								</div>

								{(pendingBookings.length + pendingTimeOff.length) > 3 && (
									<Link href="/staff/bookings" className="mt-4 inline-block text-sm font-medium text-[#0f4c75] hover:underline">
										See all {pendingBookings.length + pendingTimeOff.length} pending →
									</Link>
								)}
							</Card>
						)}

						<Card>
							<h2 className="mb-4 text-lg font-semibold text-gray-900">Today's timeline</h2>
							{timelineItems.length === 0 ? (
								<p className="text-sm text-gray-500">No confirmed bookings in your timeline today.</p>
							) : (
								<div className="relative space-y-3 border-l-2 border-gray-200 pl-4">
									<div className="absolute left-[-2px] top-0 h-full w-[2px] bg-gradient-to-b from-red-500/30 to-transparent" />
									{timelineItems.map((item) => {
										const itemDate = new Date(item.startTime);
										const now = new Date();
										const isCurrent = isSameDay(itemDate, now) && itemDate <= now;

										return (
											<div
												key={item.id}
												className="w-full rounded-lg border border-gray-100 p-3 text-left"
											>
												<div className="flex items-start justify-between gap-3">
													<div>
														<p className="text-sm font-semibold text-gray-900">
															{formatTime(item.startTime)} | {item.user?.name || item.customerName || 'Walk-in'}
														</p>
														<p className="text-sm text-gray-600">{item.services?.[0]?.serviceName || 'Service'} </p>
													</div>
													<span className={`mt-1 h-2.5 w-2.5 rounded-full ${isCurrent ? 'bg-red-500' : 'bg-cyan-500'}`} />
												</div>
											  </div>
										);
									})}
								</div>
							)}
						</Card>
					</div>

					<div className="xl:col-span-4 space-y-6">
						<Card>
							<h2 className="mb-4 text-lg font-semibold text-gray-900">My earnings today</h2>
							<div className="h-52">
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={earningsSplit}
											dataKey="value"
											nameKey="name"
											innerRadius={55}
											outerRadius={80}
											paddingAngle={4}
										>
											{earningsSplit.map((_, idx) => (
												<Cell key={idx} fill={DONUT_COLORS[idx]} />
											))}
										</Pie>
										<Tooltip formatter={(value) => formatPrice(Number(value || 0))} />
									</PieChart>
								</ResponsiveContainer>
							</div>
							<p className="-mt-4 mb-3 text-center text-sm font-semibold text-gray-900">Total {formatPrice(totalEarnings)}</p>

							<div className="space-y-2">
								{recentEarnings.length === 0 ? (
									<p className="text-sm text-gray-500">No completed bookings yet.</p>
								) : (
									recentEarnings.map((entry: Booking) => (
										<div key={entry.id} className="flex items-center justify-between text-sm">
											<div>
												<p className="font-medium text-gray-900">{entry.user?.name || entry.customerName || 'Walk-in'}</p>
												<p className="text-xs text-gray-500">{entry.services?.[0]?.serviceName || 'Service'}</p>
											</div>
											<p className="font-semibold text-gray-900">{formatPrice(Number(entry.totalAmount || 0))}</p>
										</div>
									))
								)}
							</div>
						</Card>

						<Card>
							<h2 className="mb-3 text-lg font-semibold text-gray-900">Approval snapshot</h2>
							<div className="space-y-2 text-sm text-gray-700">
								<div className="flex items-center justify-between">
									<span>Booking approvals</span>
									<span className="font-semibold">{pendingBookings.length}</span>
								</div>
								<div className="flex items-center justify-between">
									<span>Time-off requests pending</span>
									<span className="font-semibold">{pendingTimeOff.length}</span>
								</div>
								<div className="flex items-center justify-between">
									<span>Next confirmed booking</span>
									<span className="font-semibold">{timelineItems[0] ? formatTime(timelineItems[0].startTime) : '-'}</span>
								</div>
							</div>
						</Card>
					</div>
				</div>
			</div>
		</>
	);
}
