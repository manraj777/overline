import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { format } from 'date-fns';
import { Loading, useToast } from '@/components/ui';
import { useQueueStartService, useStaffOwnBookings, useUpdateStaffOwnBookingStatus } from '@/hooks';
import { BookingStatus } from '@/types';
import { formatPrice, formatTime, cn } from '@/lib/utils';

/** Compact elapsed timer for the bookings table */
function InlineTimer({ startedAt }: { startedAt: string }) {
	const [elapsed, setElapsed] = useState(0);
	useEffect(() => {
		const start = new Date(startedAt).getTime();
		const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
		tick();
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	}, [startedAt]);
	const m = Math.floor(elapsed / 60);
	const s = elapsed % 60;
	return (
		<span className="text-[10px] font-bold text-primary tabular-nums">
			⏱ {m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}
		</span>
	);
}

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
	COMPLETED: 'badge-completed',
	CANCELLED: 'badge-cancelled',
	NO_SHOW: 'badge-cancelled',
	PENDING: 'badge-pending',
	PENDING_APPROVAL: 'badge-pending-approval',
	CONFIRMED: 'badge-confirmed',
	IN_PROGRESS: 'badge-in-progress',
	IN_SERVICE: 'badge-in-progress',
	WAITLISTED: 'badge-waitlisted',
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

	const [proposeModalBookingId, setProposeModalBookingId] = useState<string | null>(null);
	const [proposedStart, setProposedStart] = useState('');
	const [proposedEnd, setProposedEnd] = useState('');
	const [proposedNotes, setProposedNotes] = useState('');

	const handleProposeTime = async () => {
		if (!proposeModalBookingId || !proposedStart || !proposedEnd) return;
		try {
			await updateStatus.mutateAsync({
				bookingId: proposeModalBookingId,
				status: BookingStatus.PENDING_APPROVAL,
				proposedStartTime: new Date(proposedStart).toISOString(),
				proposedEndTime: new Date(proposedEnd).toISOString(),
				notes: proposedNotes || undefined,
			});
			addToast({ type: 'success', title: 'Proposal Sent', message: 'Counter-offer has been sent to the customer.' });
			setProposeModalBookingId(null);
			setProposedStart('');
			setProposedEnd('');
			setProposedNotes('');
		} catch (error: any) {
			addToast({ type: 'error', title: 'Failed', message: error?.response?.data?.message || 'Could not send proposal.' });
		}
	};

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

				{/* Card View */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{bookings.length === 0 ? (
						<div className="card-m3 p-8 text-center text-sm text-on-surface-variant">No bookings found.</div>
					) : bookings.map((booking) => (
						<div key={booking.id} className="card-m3 p-4">
							<div className="flex items-start justify-between gap-2 mb-2">
								<div className="flex items-center gap-2">
									<span className="text-sm font-bold text-on-surface">{formatTime(booking.startTime)}</span>
									{(booking.status === BookingStatus.IN_PROGRESS || booking.status === BookingStatus.IN_SERVICE) && booking.startedAt && (
										<InlineTimer startedAt={booking.startedAt} />
									)}
								</div>
								<span className={`badge-m3 text-[10px] ${STATUS_BADGE[booking.status] || 'bg-surface-container-high text-outline'}`}>
									{booking.status}
								</span>
							</div>
							<div className="space-y-1">
								<p className="font-medium text-sm text-on-surface">{booking.user?.name || booking.customerName || 'Walk-in'}</p>
								{(booking.user?.phone || booking.customerPhone) && (
									<p className="text-xs text-on-surface-variant">📞 {booking.user?.phone || booking.customerPhone}</p>
								)}
								<p className="text-xs text-on-surface-variant">{booking.services?.[0]?.serviceName || 'Service'}</p>
								<p className="text-xs font-bold text-on-surface">{formatPrice(Number(booking.totalAmount || 0))}</p>
							</div>
							<div className="mt-3 pt-3 border-t border-outline-variant/10 space-y-2">
								{(booking.status === BookingStatus.PENDING || booking.status === BookingStatus.PENDING_APPROVAL) && (
									<button
										onClick={() => updateStatus.mutate({ bookingId: booking.id, status: BookingStatus.CONFIRMED })}
										disabled={updateStatus.isPending}
										className="w-full btn-primary px-3 py-2 text-xs disabled:opacity-50"
									>
										✓ Approve
									</button>
								)}
								{booking.status === BookingStatus.CONFIRMED && (
									<button
										onClick={() => handleStartWithCode(booking.id)}
										disabled={startService.isPending}
										className="w-full btn-primary px-3 py-2 text-xs disabled:opacity-50"
										style={{ backgroundColor: '#059669' }}
									>
										▶ Start Service
									</button>
								)}
								{(booking.status === BookingStatus.IN_PROGRESS || booking.status === BookingStatus.IN_SERVICE) && (
									<button
										onClick={() => updateStatus.mutate({ bookingId: booking.id, status: BookingStatus.COMPLETED })}
										disabled={updateStatus.isPending}
										className="w-full btn-primary px-3 py-2 text-xs disabled:opacity-50"
									>
										✓ Complete Service
									</button>
								)}
								<div className="flex flex-wrap gap-1.5">
									{booking.status === BookingStatus.PENDING && (
										<button
											onClick={() => setProposeModalBookingId(booking.id)}
											disabled={updateStatus.isPending}
											className="btn-outline px-2.5 py-1.5 text-[11px] disabled:opacity-50"
										>
											Propose Time
										</button>
									)}
									{['PENDING', 'PENDING_APPROVAL', 'CONFIRMED'].includes(booking.status) && booking.userId && (
										<button onClick={() => window.open(`/chat/${booking.userId}?booking=${booking.id}`, "_blank")} className="btn-outline px-2.5 py-1.5 text-[11px] text-primary border-primary">
											Chat
										</button>
									)}
								</div>
							</div>
						</div>
					))}
				</div>
			</div>

			{proposeModalBookingId && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
					<div className="w-full max-w-sm card-m3 p-5">
						<h3 className="text-lg font-semibold text-on-surface">Propose New Time / Fast Track</h3>
						<p className="mt-2 text-sm text-on-surface-variant">
							Select a new start and end time to propose to the customer.
						</p>
						<div className="mt-4 space-y-3">
<div className="flex gap-2 mb-3">
  <button type="button" onClick={() => { const now = new Date(); now.setMinutes(now.getMinutes() + 15); setProposedStart(now.toISOString().slice(0, 16)); now.setMinutes(now.getMinutes() + 30); setProposedEnd(now.toISOString().slice(0, 16)); setProposedNotes("Fast track available! We can take you in 15 mins."); }} className="btn-outline text-xs px-2 py-1 border-primary text-primary">In 15 Mins</button>
  <button type="button" onClick={() => { const now = new Date(); now.setMinutes(now.getMinutes() + 30); setProposedStart(now.toISOString().slice(0, 16)); now.setMinutes(now.getMinutes() + 30); setProposedEnd(now.toISOString().slice(0, 16)); setProposedNotes("Immediate opening! We can take you in 30 mins."); }} className="btn-outline text-xs px-2 py-1 border-primary text-primary">In 30 Mins</button>
</div>
							<div>
								<label className="text-xs text-on-surface-variant mb-1 block">Proposed Start Time</label>
								<input
									type="datetime-local"
									value={proposedStart}
									onChange={(e) => setProposedStart(e.target.value)}
									className="input-m3 w-full"
								/>
							</div>
							<div>
								<label className="text-xs text-on-surface-variant mb-1 block">Proposed End Time</label>
								<input
									type="datetime-local"
									value={proposedEnd}
									onChange={(e) => setProposedEnd(e.target.value)}
									className="input-m3 w-full"
								/>
							</div>
							<div>
								<label className="text-xs text-on-surface-variant mb-1 block">Notes for Customer</label>
								<textarea
									value={proposedNotes}
									onChange={(e) => setProposedNotes(e.target.value)}
									className="input-m3 w-full resize-none"
									rows={2}
									placeholder="Explain why you're proposing this time..."
								/>
							</div>
						</div>
						<div className="mt-6 flex justify-end gap-2">
							<button
								onClick={() => {
									setProposeModalBookingId(null);
									setProposedStart('');
									setProposedEnd('');
									setProposedNotes('');
								}}
								className="btn-outline px-4 py-1.5 text-xs"
							>
								Cancel
							</button>
							<button
								onClick={handleProposeTime}
								disabled={updateStatus.isPending || !proposedStart || !proposedEnd}
								className="btn-primary px-4 py-1.5 text-xs disabled:opacity-50"
							>
								{updateStatus.isPending ? 'Sending...' : 'Send Proposal'}
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
