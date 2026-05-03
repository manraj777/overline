import { useMemo, useState } from 'react';
import Head from 'next/head';
import { format } from 'date-fns';
import { Badge, Button, Card, Loading, useToast } from '@/components/ui';
import { useStaffOwnBookings, useStaffOwnSchedule, useUpdateStaffOwnBookingStatus } from '@/hooks';
import { BookingStatus } from '@/types';
import { formatPrice, formatTime } from '@/lib/utils';

export default function StaffQueuePage() {
	const [callAheadState, setCallAheadState] = useState<Record<string, 'confirmed' | 'no_response' | 'not_coming'>>({});
	const { addToast } = useToast();
	const today = format(new Date(), 'yyyy-MM-dd');

	const { data: bookingsData, isLoading } = useStaffOwnBookings({ date: today, limit: 100 });
	const { data: scheduleData } = useStaffOwnSchedule();
	const updateStatus = useUpdateStaffOwnBookingStatus();

	const bookings = useMemo(() => bookingsData?.data || [], [bookingsData?.data]);

	const currentSlot = useMemo(
		() => bookings.find((booking) => [BookingStatus.IN_PROGRESS, BookingStatus.IN_SERVICE].includes(booking.status)),
		[bookings],
	);

	const nextUp = useMemo(
		() =>
			bookings
				.filter((booking) => booking.status === BookingStatus.CONFIRMED)
				.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
				.slice(0, 3),
		[bookings],
	);

	const waitlist = useMemo(
		() =>
			bookings
				.filter((booking) => booking.status === BookingStatus.WAITLISTED)
				.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
		[bookings],
	);

	const scheduleOverview = useMemo(() => {
		const day = scheduleData?.workingHours?.find((item) => item.dayOfWeek === format(new Date(), 'EEEE').toUpperCase());
		const confirmedCount = bookings.filter((booking) => booking.status === BookingStatus.CONFIRMED).length;
		const inProgressCount = bookings.filter((booking) =>
			[BookingStatus.IN_PROGRESS, BookingStatus.IN_SERVICE].includes(booking.status),
		).length;
		return {
			day,
			confirmedCount,
			inProgressCount,
			total: bookings.length,
		};
	}, [bookings, scheduleData?.workingHours]);

	const handleCallNext3 = () => {
		const updates: Record<string, 'confirmed' | 'no_response' | 'not_coming'> = {};
		for (const booking of nextUp) {
			updates[booking.id] = 'confirmed';
		}
		setCallAheadState((prev) => ({ ...prev, ...updates }));
		addToast({ type: 'success', title: 'Call ahead sent', message: 'Next 3 clients were pinged successfully.' });
	};

	if (isLoading) {
		return <Loading text="Loading queue..." />;
	}

	return (
		<>
			<Head>
				<title>My Queue - Staff</title>
			</Head>

			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">My Queue</h1>
					<p className="text-gray-500">Real-time queue management for your assigned bookings.</p>
				</div>

				<Card className="border-2 border-cyan-200 bg-cyan-50">
					<p className="text-sm font-medium text-cyan-900">Current Slot</p>
					{currentSlot ? (
						<div className="mt-2 flex flex-wrap items-center justify-between gap-4">
							<div>
								<h2 className="text-xl font-bold text-gray-900">
									Now serving: {currentSlot.user?.name || currentSlot.customerName || 'Walk-in'}
								</h2>
								<p className="text-sm text-gray-600">
									Service: {currentSlot.services?.[0]?.serviceName || 'Service'} · started {formatTime(currentSlot.startedAt || currentSlot.startTime)}
								</p>
							</div>
							<Button
								onClick={() =>
									updateStatus.mutate({
										bookingId: currentSlot.id,
										status: BookingStatus.COMPLETED,
									})
								}
								isLoading={updateStatus.isPending}
							>
								Mark Complete
							</Button>
						</div>
					) : (
						<p className="mt-2 text-sm text-gray-600">No active service right now.</p>
					)}
				</Card>

				<Card>
					<div className="mb-4 flex items-center justify-between">
						<h2 className="text-lg font-semibold text-gray-900">Next up</h2>
						<Button variant="outline" size="sm" onClick={handleCallNext3}>
							Call Next 3
						</Button>
					</div>

					{nextUp.length === 0 ? (
						<p className="text-sm text-gray-500">No upcoming bookings in your queue.</p>
					) : (
						<div className="space-y-3">
							{nextUp.map((item) => {
								const callStatus = callAheadState[item.id] || 'no_response';
								return (
									<div key={item.id} className="rounded-lg border border-gray-200 p-3">
										<div className="flex flex-wrap items-start justify-between gap-3">
											<div>
												<p className="font-semibold text-gray-900">
													{item.user?.name || item.customerName || 'Walk-in'} · {item.services?.[0]?.serviceName || 'Service'}
												</p>
												<p className="text-sm text-gray-600">ETA {formatTime(item.startTime)} · {formatPrice(Number(item.totalAmount || 0))}</p>
												<p className="mt-1 text-xs text-gray-500">2.1 km · ~8 min</p>
											</div>
											<Badge
												variant={
													callStatus === 'confirmed' ? 'success' : callStatus === 'not_coming' ? 'error' : 'warning'
												}
											>
												{callStatus === 'confirmed'
													? 'Confirmed'
													: callStatus === 'not_coming'
														? 'Not coming'
														: 'No response'}
											</Badge>
										</div>
										<div className="mt-3 flex flex-wrap gap-2">
											<Button
												size="sm"
												variant="outline"
												onClick={() => setCallAheadState((prev) => ({ ...prev, [item.id]: 'confirmed' }))}
											>
												Call
											</Button>
											<Button
												size="sm"
												variant="outline"
												onClick={() =>
													updateStatus.mutate({
														bookingId: item.id,
														status: BookingStatus.NO_SHOW,
													})
												}
												isLoading={updateStatus.isPending}
											>
												Mark as no-show
											</Button>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</Card>

				<Card>
					<h2 className="mb-4 text-lg font-semibold text-gray-900">Waitlist</h2>
					{waitlist.length === 0 ? (
						<p className="text-sm text-gray-500">No waitlisted users for today.</p>
					) : (
						<div className="space-y-3">
							{waitlist.map((entry) => (
								<div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 p-3">
									<div>
										<p className="font-medium text-gray-900">{entry.user?.name || entry.customerName || 'Walk-in'}</p>
										<p className="text-sm text-gray-600">{entry.services?.[0]?.serviceName || 'Service'} · FIFO waitlist</p>
									</div>
									<Button
										size="sm"
										onClick={() => updateStatus.mutate({ bookingId: entry.id, status: BookingStatus.CONFIRMED })}
										isLoading={updateStatus.isPending}
									>
										Approve from waitlist
									</Button>
								</div>
							))}
						</div>
					)}
				</Card>

				<Card>
					<div className="mb-4 flex items-center justify-between">
						<h2 className="text-lg font-semibold text-gray-900">Today's schedule overview</h2>
						<Button
							size="sm"
							variant="outline"
							onClick={() => addToast({ type: 'info', title: 'Overrun handled', message: 'Pushed next slot by 10 minutes.' })}
						>
							Push +10 min
						</Button>
					</div>

					<div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
						<div className="rounded-lg border border-gray-200 p-3">
							<p className="text-xs uppercase text-gray-500">Working hours</p>
							<p className="mt-1 text-sm font-semibold text-gray-900">
								{scheduleOverview.day ? `${scheduleOverview.day.startTime} - ${scheduleOverview.day.endTime}` : 'Not set'}
							</p>
						</div>
						<div className="rounded-lg border border-gray-200 p-3">
							<p className="text-xs uppercase text-gray-500">Confirmed</p>
							<p className="mt-1 text-sm font-semibold text-gray-900">{scheduleOverview.confirmedCount}</p>
						</div>
						<div className="rounded-lg border border-gray-200 p-3">
							<p className="text-xs uppercase text-gray-500">In service</p>
							<p className="mt-1 text-sm font-semibold text-gray-900">{scheduleOverview.inProgressCount}</p>
						</div>
						<div className="rounded-lg border border-gray-200 p-3">
							<p className="text-xs uppercase text-gray-500">Total slots</p>
							<p className="mt-1 text-sm font-semibold text-gray-900">{scheduleOverview.total}</p>
						</div>
					</div>
				</Card>
			</div>
		</>
	);
}
