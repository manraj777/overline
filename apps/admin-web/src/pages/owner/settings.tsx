import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Globe, Moon, User, Share2, Info, ShieldCheck, LogOut, Save } from 'lucide-react';
import { useLogout, useUser } from '@/hooks';
import { Button, Input, Loading, useToast } from '@/components/ui';
import api from '@/lib/api';

type AppearanceMode = 'light' | 'dark' | 'system';

export default function OwnerSystemSettingsPage() {
	const router = useRouter();
	const { addToast } = useToast();
	const logout = useLogout();
	const { data: user, isLoading } = useUser();

	const [language, setLanguage] = React.useState('English');
	const [appearance, setAppearance] = React.useState<AppearanceMode>('system');
	const [form, setForm] = React.useState({
		name: '',
		phone: '',
		avatarUrl: '',
	});

	React.useEffect(() => {
		if (!user) return;
		setForm({
			name: user.name || '',
			phone: user.phone || '',
			avatarUrl: user.avatarUrl || '',
		});
	}, [user]);

	const saveProfile = async (event: React.FormEvent) => {
		event.preventDefault();
		try {
			await api.patch('/users/me', form);
			addToast({ type: 'success', title: 'Profile updated' });
		} catch (error: any) {
			addToast({ type: 'error', title: 'Failed to update profile', message: error?.response?.data?.message || 'Try again.' });
		}
	};

	const savePreferences = async () => {
		try {
			await api.patch('/users/me/preferences', {
				language,
				appearance,
			});
			addToast({ type: 'success', title: 'Preferences saved' });
		} catch {
			addToast({ type: 'warning', title: 'Saved locally', message: 'Preference API unavailable, keeping your selection in this session.' });
		}
	};

	const handleLogout = async () => {
		await logout.mutateAsync();
		router.push('/login');
	};

	if (isLoading) {
		return <Loading text="Loading system settings..." />;
	}

	return (
		<>
			<Head>
				<title>System Settings — Owner</title>
			</Head>

			<div className="space-y-6">
				<div>
					<span className="label-m3 mb-2 block">Owner Portal</span>
					<h1 className="text-3xl font-black tracking-tight text-on-surface">System Settings</h1>
					<p className="text-on-surface-variant text-sm mt-1">Language, appearance, profile controls, and policy links.</p>
				</div>

				<div className="card-m3 p-6 space-y-5">
					<h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
						<Globe className="w-5 h-5" /> Language & Appearance
					</h2>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="label-m3">Language</label>
							<select
								className="input-m3 mt-1"
								value={language}
								onChange={(e) => setLanguage(e.target.value)}
							>
								<option>English</option>
								<option>Hindi</option>
							</select>
						</div>

						<div>
							<label className="label-m3">Appearance</label>
							<select
								className="input-m3 mt-1"
								value={appearance}
								onChange={(e) => setAppearance(e.target.value as AppearanceMode)}
							>
								<option value="light">Light</option>
								<option value="dark">Dark</option>
								<option value="system">System</option>
							</select>
						</div>
					</div>

					<button onClick={savePreferences} className="btn-primary px-5 py-2.5 w-fit">
						<Moon className="w-4 h-4" /> Save Preferences
					</button>
				</div>

				<div className="card-m3 p-6">
					<h2 className="text-lg font-bold text-on-surface flex items-center gap-2 mb-5">
						<User className="w-5 h-5" /> Profile Updation
					</h2>

					<form className="space-y-4" onSubmit={saveProfile}>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<Input
								label="Name"
								value={form.name}
								onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
							/>
							<Input
								label="Phone"
								value={form.phone}
								onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
							/>
						</div>
						<Input
							label="Avatar URL"
							value={form.avatarUrl}
							onChange={(e) => setForm((prev) => ({ ...prev, avatarUrl: e.target.value }))}
						/>

						<Button type="submit" className="btn-primary px-5 py-2.5 w-fit">
							<Save className="w-4 h-4" /> Save Profile
						</Button>
					</form>
				</div>

				<div className="card-m3 p-6 space-y-4">
					<h2 className="text-lg font-bold text-on-surface">Refer, About, and Policies</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<Link href="/" className="btn-tonal justify-start"><Share2 className="w-4 h-4" /> Refer</Link>
						<Link href="/" className="btn-tonal justify-start"><Info className="w-4 h-4" /> About Us</Link>
						<Link href="/" className="btn-tonal justify-start"><ShieldCheck className="w-4 h-4" /> Privacy Policy</Link>
						<Link href="/" className="btn-tonal justify-start"><ShieldCheck className="w-4 h-4" /> Terms & Conditions</Link>
					</div>
				</div>

				<div>
					<button onClick={handleLogout} className="btn-danger px-5 py-2.5 w-fit">
						<LogOut className="w-4 h-4" /> Sign Out
					</button>
				</div>
			</div>
		</>
	);
}
