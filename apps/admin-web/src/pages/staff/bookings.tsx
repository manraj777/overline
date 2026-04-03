import { useMemo, useState } from 'react';
import Head from 'next/head';
import { format } from 'date-fns';
import { Badge, Button, Card, Loading } from '@/components/ui';
import { useStaffOwnBookings, useUpdateStaffOwnBookingStatus } from '@/hooks';
import { BookingStatus } from '@/types';
import { formatPrice, formatTime } from '@/lib/utils';

const STATUS_OPTIONS: Array<BookingStatus | 'ALL'> = [
	'ALL',
	BookingStatus.PENDING,
	BookingStatus.PENDING_APPROVAL,
	BookingStatus.CONFIRMED,
	BookingStatus.IN_PROGRESS,
	BookingStatus.COMPLETED,
	BookingStatus.CANCELLED,
	BookingStatus.WAITLISTED,
];

export default function StaffBookingsPage() {
	const [statusFilter, setStatusFilter] = useState<BookingStatus | 'ALL'>('ALL');
	const [search, setSearch] = useState('');

	const { data, isLoading } = useStaffOwnBookings({
		date: format(new Date(), 'yyyy-MM-dd'),
		status: statusFilter === 'ALL' ? undefined : statusFilter,
		limit: 100,
	});
	const updateStatus = useUpdateStaffOwnBookingStatus();

	const bookings = useMemo(() => {
		const list = data?.data || [];
		if (!search.trim()) return list;
		const query = search.toLowerCase();
		return list.filter((booking) => {
			const customer = booking.user?.name || booking.customerName || '';
			const service = booking.services?.[0]?.serviceName || '';
			return customer.toLowerCase().includes(query) || service.toLowerCase().includes(query);
		});
	}, [data?.data, search]);

	if (isLoading) {
		return <Loading text="Loading your bookings..." />;
	}

	return (
		<>
			<Head>
				<title>My Bookings - Staff</title>
			</Head>

			<div className="space-y-6">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
						<p className="text-gray-500">Only bookings assigned to you are shown here.</p>
					</div>
					<input
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Search customer/service"
						className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm sm:w-72"
					/>
				</div>

				<div className="flex flex-wrap gap-2">
					{STATUS_OPTIONS.map((status) => (
						<button
							key={status}
							type="button"
							onClick={() => setStatusFilter(status)}
							className={`rounded-full px-3 py-1.5 text-xs font-medium ${
								statusFilter === status ? 'bg-[#0f4c75] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							}`}
						>
							{status}
						</button>
					))}
				</div>

				<Card className="p-0 overflow-hidden">
					{bookings.length === 0 ? (
						<div className="p-10 text-center text-sm text-gray-500">No bookings found for the selected filter.</div>
					) : (
						<table className="min-w-full text-sm">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Time</th>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Customer</th>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Service</th>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Amount</th>
									<th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
									<th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100">
								{bookings.map((booking) => (
									<tr key={booking.id}>
										<td className="px-4 py-3 text-gray-800">{formatTime(booking.startTime)}</td>
										<td className="px-4 py-3 text-gray-800">{booking.user?.name || booking.customerName || 'Walk-in'}</td>
										<td className="px-4 py-3 text-gray-700">{booking.services?.[0]?.serviceName || 'Service'}</td>
										<td className="px-4 py-3 text-gray-700">{formatPrice(Number(booking.totalAmount || 0))}</td>
										<td className="px-4 py-3">
											<Badge
												variant={
													booking.status === BookingStatus.COMPLETED
														? 'success'
														: booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.NO_SHOW
															? 'error'
															: booking.status === BookingStatus.PENDING || booking.status === BookingStatus.PENDING_APPROVAL
																? 'warning'
																: 'info'
												}
											>
												{booking.status}
											</Badge>
										</td>
										<td className="px-4 py-3 text-right">
											<div className="flex justify-end gap-2">
												{(booking.status === BookingStatus.PENDING || booking.status === BookingStatus.PENDING_APPROVAL) && (
													<Button
														size="sm"
														onClick={() => updateStatus.mutate({ bookingId: booking.id, status: BookingStatus.CONFIRMED })}
														isLoading={updateStatus.isPending}
													>
														Approve
													</Button>
												)}
												{booking.status === BookingStatus.CONFIRMED && (
													<Button
														size="sm"
														onClick={() => updateStatus.mutate({ bookingId: booking.id, status: BookingStatus.IN_PROGRESS })}
														isLoading={updateStatus.isPending}
													>
														Start
													</Button>
												)}
												{(booking.status === BookingStatus.IN_PROGRESS || booking.status === BookingStatus.IN_SERVICE) && (
													<Button
														size="sm"
														onClick={() => updateStatus.mutate({ bookingId: booking.id, status: BookingStatus.COMPLETED })}
														isLoading={updateStatus.isPending}
													>
														Complete
													</Button>
												)}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</Card>
			</div>
		</>
	);
}
