import { useMemo, useState } from 'react';
import Head from 'next/head';
import { format } from 'date-fns';
import { Loading, useToast } from '@/components/ui';
import { useQueueStartService, useStaffOwnBookings, useUpdateStaffOwnBookingStatus } from '@/hooks';
import { BookingStatus } from '@/types';
import { formatPrice, formatTime, cn } from '@/lib/utils';

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

const STATUS_BADGE: Record<string, string> = {
	COMPLETED: 'bg-tertiary-fixed text-tertiary',
	CANCELLED: 'bg-error-container text-error',
	NO_SHOW: 'bg-error-container text-error',
	PENDING: 'bg-amber-100 text-amber-700',
	PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
	CONFIRMED: 'bg-primary-fixed text-primary',
	IN_PROGRESS: 'bg-secondary-fixed text-secondary',
	IN_SERVICE: 'bg-secondary-fixed text-secondary',
	WAITLISTED: 'bg-surface-container-high text-outline',
};

export default function StaffBookingsPage() {
	const { addToast } = useToast();
	const [statusFilter, setStatusFilter] = useState<BookingStatus | 'ALL'>('ALL');
	const [search, setSearch] = useState('');

	const { data, isLoading } = useStaffOwnBookings({
		date: format(new Date(), 'yyyy-MM-dd'),
		status: statusFilter === 'ALL' ? undefined : statusFilter,
		limit: 100,
	});
	const updateStatus = useUpdateStaffOwnBookingStatus();
	const startService = useQueueStartService();

	const handleStartWithCode = async (bookingId: string) => {
		const enteredCode = window.prompt('Enter customer 4-digit verification code');
		if (!enteredCode) return;

		try {
			await startService.mutateAsync({
				bookingId,
				verificationCode: enteredCode.trim(),
			});
			addToast({ type: 'success', title: 'Service started', message: 'Verification code accepted.' });
		} catch (error: any) {
			addToast({
				type: 'error',
				title: 'Invalid code',
				message: error?.response?.data?.message || 'Could not start service.',
			});
		}
	};

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

	if (isLoading) return <Loading text="Loading your bookings..." />;

	return (
		<>
			<Head>
				<title>My Bookings — Staff</title>
				<meta name="description" content="View and manage your assigned bookings." />
			</Head>

			<div className="space-y-6">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<span className="label-m3 mb-2 block">Queue</span>
						<h1 className="text-3xl font-black tracking-tight text-on-surface">My Bookings</h1>
						<p className="text-on-surface-variant text-sm mt-1">Only bookings assigned to you are shown here.</p>
					</div>
					<input
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Search customer/service"
						className="input-m3 sm:w-72"
					/>
				</div>

				<div className="flex flex-wrap gap-2">
					{STATUS_OPTIONS.map((status) => (
						<button
							key={status}
							type="button"
							onClick={() => setStatusFilter(status)}
							className={cn(
								'rounded-xl px-4 py-2 text-[10px] font-bold transition-all',
								statusFilter === status
									? 'bg-primary text-white shadow-button'
									: 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high border border-outline-variant/10'
							)}
						>
							{status}
						</button>
					))}
				</div>

				<div className="card-m3 overflow-hidden">
					{bookings.length === 0 ? (
						<div className="p-12 text-center text-sm text-on-surface-variant">No bookings found for the selected filter.</div>
					) : (
						<table className="table-m3">
							<thead>
								<tr>
									<th>Time</th>
									<th>Customer</th>
									<th>Service</th>
									<th>Amount</th>
									<th>Status</th>
									<th className="text-right">Actions</th>
								</tr>
							</thead>
							<tbody>
								{bookings.map((booking) => (
									<tr key={booking.id}>
										<td><span className="font-bold">{formatTime(booking.startTime)}</span></td>
										<td><span className="font-medium">{booking.user?.name || booking.customerName || 'Walk-in'}</span></td>
										<td className="text-on-surface-variant">{booking.services?.[0]?.serviceName || 'Service'}</td>
										<td><span className="font-bold">{formatPrice(Number(booking.totalAmount || 0))}</span></td>
										<td>
											<span className={`badge-m3 ${STATUS_BADGE[booking.status] || 'bg-surface-container-high text-outline'}`}>
												{booking.status}
											</span>
										</td>
										<td className="text-right">
											<div className="flex justify-end gap-2">
												{(booking.status === BookingStatus.PENDING || booking.status === BookingStatus.PENDING_APPROVAL) && (
													<button
														onClick={() => updateStatus.mutate({ bookingId: booking.id, status: BookingStatus.CONFIRMED })}
														disabled={updateStatus.isPending}
														className="btn-primary px-3 py-1 text-[10px] disabled:opacity-50"
													>
														Approve
													</button>
												)}
												{booking.status === BookingStatus.CONFIRMED && (
													<button
														onClick={() => handleStartWithCode(booking.id)}
														disabled={startService.isPending}
														className="btn-primary px-3 py-1 text-[10px] disabled:opacity-50"
													>
														Start
													</button>
												)}
												{(booking.status === BookingStatus.IN_PROGRESS || booking.status === BookingStatus.IN_SERVICE) && (
													<button
														onClick={() => updateStatus.mutate({ bookingId: booking.id, status: BookingStatus.COMPLETED })}
														disabled={updateStatus.isPending}
														className="btn-primary px-3 py-1 text-[10px] disabled:opacity-50"
													>
														Complete
													</button>
												)}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>
			</div>
		</>
	);
}
