import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { Button, Card, Loading, useToast } from '@/components/ui';
import { useStaffMe, useUpdateStaffMe } from '@/hooks';

type ReminderOption = 30 | 60 | 120 | 1440;
type CallAheadOption = 15 | 30 | 45;

export default function StaffNotificationSettingsPage() {
	const { addToast } = useToast();
	const { data: me, isLoading } = useStaffMe();
	const updateMe = useUpdateStaffMe();

	const initial = useMemo(() => {
		const settings = me?.notificationSettings || {};
		return {
			reminderEnabled: Boolean(settings.notifReminderMins),
			reminderMins: (settings.notifReminderMins || 30) as ReminderOption,
			callAheadEnabled: Boolean(settings.notifCallAheadMins),
			callAheadMins: (settings.notifCallAheadMins || 15) as CallAheadOption,
			requireReplyMins: 10,
			notifNewBooking: settings.notifNewBooking ?? true,
			notifLocationShare: settings.notifLocationShare ?? true,
			notifReview: settings.notifReview ?? true,
			notifNoShow: settings.notifNoShow ?? true,
			notifSlotOverrun: true,
		};
	}, [me?.notificationSettings]);

	const [form, setForm] = useState(initial);

	useEffect(() => {
		setForm(initial);
	}, [initial]);

	const save = async () => {
		try {
			await updateMe.mutateAsync({
				notifReminderMins: form.reminderEnabled ? form.reminderMins : 0,
				notifCallAheadMins: form.callAheadEnabled ? form.callAheadMins : 0,
				notifNewBooking: form.notifNewBooking,
				notifLocationShare: form.notifLocationShare,
				notifReview: form.notifReview,
				notifNoShow: form.notifNoShow,
			});
			addToast({ type: 'success', title: 'Saved', message: 'Notification settings updated successfully.' });
		} catch {
			addToast({ type: 'error', title: 'Save failed', message: 'Could not update notification settings.' });
		}
	};

	if (isLoading) {
		return <Loading text="Loading notification settings..." />;
	}

	return (
		<>
			<Head>
				<title>Notification Settings - Staff</title>
			</Head>

			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Notification Settings</h1>
					<p className="text-gray-500">Configure client reminders, call-ahead pings and your alerts.</p>
				</div>

				<Card>
					<h2 className="text-lg font-semibold text-gray-900">Reminder to client</h2>
					<div className="mt-4 flex flex-wrap items-center gap-3">
						<label className="inline-flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={form.reminderEnabled}
								onChange={(event) => setForm((prev) => ({ ...prev, reminderEnabled: event.target.checked }))}
							/>
							Send reminder to client
						</label>
						<select
							value={form.reminderMins}
							onChange={(event) => setForm((prev) => ({ ...prev, reminderMins: Number(event.target.value) as ReminderOption }))}
							className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
							disabled={!form.reminderEnabled}
						>
							<option value={30}>30 min</option>
							<option value={60}>1 hour</option>
							<option value={120}>2 hours</option>
							<option value={1440}>1 day before</option>
						</select>
					</div>
				</Card>

				<Card>
					<h2 className="text-lg font-semibold text-gray-900">Call-ahead</h2>
					<div className="mt-4 flex flex-wrap items-center gap-3">
						<label className="inline-flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={form.callAheadEnabled}
								onChange={(event) => setForm((prev) => ({ ...prev, callAheadEnabled: event.target.checked }))}
							/>
							Ping next 3 clients
						</label>
						<select
							value={form.callAheadMins}
							onChange={(event) => setForm((prev) => ({ ...prev, callAheadMins: Number(event.target.value) as CallAheadOption }))}
							className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
							disabled={!form.callAheadEnabled}
						>
							<option value={15}>15 min</option>
							<option value={30}>30 min</option>
							<option value={45}>45 min</option>
						</select>
						<label className="text-sm text-gray-700">
							Require reply within:
							<input
								type="number"
								value={form.requireReplyMins}
								onChange={(event) => setForm((prev) => ({ ...prev, requireReplyMins: Number(event.target.value) || 10 }))}
								className="ml-2 h-9 w-20 rounded-lg border border-gray-300 px-2"
							/>
							<span className="ml-1">min</span>
						</label>
					</div>
				</Card>

				<Card>
					<h2 className="text-lg font-semibold text-gray-900">My alerts</h2>
					<div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
						{[
							['notifNewBooking', 'New booking request'],
							['notifLocationShare', 'Client location shared'],
							['notifReview', 'New review'],
							['notifNoShow', 'No-show detected'],
							['notifSlotOverrun', 'Slot overrun detected'],
						].map(([key, label]) => (
							<label key={key} className="inline-flex items-center gap-2 text-sm text-gray-700">
								<input
									type="checkbox"
									checked={Boolean(form[key as keyof typeof form])}
									onChange={(event) =>
										setForm((prev) => ({ ...prev, [key]: event.target.checked }))
									}
								/>
								{label}
							</label>
						))}
					</div>
				</Card>

				<div className="flex justify-end">
					<Button onClick={save} isLoading={updateMe.isPending}>
						Save Preferences
					</Button>
				</div>
			</div>
		</>
	);
}
