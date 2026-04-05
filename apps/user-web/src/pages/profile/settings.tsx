import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Globe2, Palette, ShieldCheck, Info, Check } from 'lucide-react';
import { Loading } from '@/components/ui';
import { useAuthStore } from '@/stores/auth';

type Appearance = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'overline-user-settings-v1';

interface SettingsState {
  language: 'en' | 'hi';
  appearance: Appearance;
  marketingEmails: boolean;
  bookingReminders: boolean;
  profileVisibility: 'private' | 'public';
}

const initialState: SettingsState = {
  language: 'en',
  appearance: 'system',
  marketingEmails: true,
  bookingReminders: true,
  profileVisibility: 'private',
};

export default function SettingsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [saved, setSaved] = React.useState(false);
  const [settings, setSettings] = React.useState<SettingsState>(initialState);

  React.useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY);
      if (savedSettings) {
        setSettings({ ...initialState, ...JSON.parse(savedSettings) });
      }
    } catch {
      setSettings(initialState);
    }
  }, []);

  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/profile/settings');
    }
  }, [authLoading, isAuthenticated, router]);

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  if (authLoading || !isAuthenticated) {
    return <Loading text="Loading settings..." />;
  }

  return (
    <>
      <Head>
        <title>Settings — Overline</title>
      </Head>

      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <p className="text-xs font-bold tracking-widest uppercase text-outline mb-2">Preferences</p>
          <h1 className="text-3xl font-black tracking-tight text-on-surface">Settings</h1>
          <p className="text-on-surface-variant mt-2">These are account-level preferences for your Overline experience.</p>
        </div>

        <div className="card-m3 p-6">
          <h2 className="font-bold text-on-surface mb-4 flex items-center gap-2">
            <Info className="w-4 h-4" />
            About
          </h2>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Settings control language, appearance, and permission preferences for your account. Role-level access policy
            controls for owner/staff are managed from admin tools and will be connected in a later backend phase.
          </p>
        </div>

        <div className="card-m3 p-6 grid gap-6">
          <section>
            <h2 className="font-bold text-on-surface mb-3 flex items-center gap-2">
              <Globe2 className="w-4 h-4" />
              Language
            </h2>
            <div className="flex gap-2">
              {[
                { value: 'en', label: 'English' },
                { value: 'hi', label: 'Hindi' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSettings((prev) => ({ ...prev, language: option.value as 'en' | 'hi' }))}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                    settings.language === option.value
                      ? 'bg-primary text-white'
                      : 'bg-surface-container-low text-on-surface-variant'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-bold text-on-surface mb-3 flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Appearance
            </h2>
            <div className="flex gap-2">
              {['system', 'light', 'dark'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSettings((prev) => ({ ...prev, appearance: mode as Appearance }))}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize ${
                    settings.appearance === mode
                      ? 'bg-primary text-white'
                      : 'bg-surface-container-low text-on-surface-variant'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-bold text-on-surface mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Permissions
            </h2>
            <div className="space-y-3">
              <label className="flex items-center justify-between rounded-xl bg-surface-container-low p-3">
                <span className="text-sm font-medium text-on-surface">Marketing Emails</span>
                <input
                  type="checkbox"
                  checked={settings.marketingEmails}
                  onChange={(e) => setSettings((prev) => ({ ...prev, marketingEmails: e.target.checked }))}
                />
              </label>
              <label className="flex items-center justify-between rounded-xl bg-surface-container-low p-3">
                <span className="text-sm font-medium text-on-surface">Booking Reminders</span>
                <input
                  type="checkbox"
                  checked={settings.bookingReminders}
                  onChange={(e) => setSettings((prev) => ({ ...prev, bookingReminders: e.target.checked }))}
                />
              </label>
              <div className="rounded-xl bg-surface-container-low p-3">
                <p className="text-sm font-medium text-on-surface mb-2">Profile Visibility</p>
                <div className="flex gap-2">
                  {['private', 'public'].map((value) => (
                    <button
                      key={value}
                      onClick={() => setSettings((prev) => ({ ...prev, profileVisibility: value as 'private' | 'public' }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase ${
                        settings.profileVisibility === value
                          ? 'bg-primary text-white'
                          : 'bg-white text-on-surface-variant'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div>
            <button onClick={save} className="btn-primary px-6 py-2.5 inline-flex items-center gap-2">
              <Check className="w-4 h-4" />
              Save Settings
            </button>
            {saved && <span className="ml-3 text-sm text-tertiary font-semibold">Saved</span>}
          </div>
        </div>
      </div>
    </>
  );
}
