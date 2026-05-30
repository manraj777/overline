'use client';

import Link from 'next/link';
import { useRouter } from 'next/router';
import { Bell, BarChart3, Clock3, LayoutDashboard, Settings, Users, UserRound, Siren, Rocket, Shield } from 'lucide-react';
import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { useSettingsStore } from '@/stores/settings';

interface SidebarProps {
  unreadCount?: number;
}

const items = [
  { href: '/dashboard', label: 'Dashboard', hiLabel: 'डैशबोर्ड', icon: LayoutDashboard },
  { href: '/queue', label: 'Queue', hiLabel: 'कतार', icon: Clock3 },
  { href: '/appointments', label: 'Appointments', hiLabel: 'बुकिंग', icon: Users },
  { href: '/customers', label: 'Customers', hiLabel: 'ग्राहक', icon: UserRound },
  { href: '/analytics', label: 'Analytics', hiLabel: 'एनालिटिक्स', icon: BarChart3 },
  { href: '/notifications', label: 'Notifications', hiLabel: 'सूचनाएं', icon: Bell },
  { href: '/settings', label: 'Settings', hiLabel: 'सेटिंग्स', icon: Settings },
  { href: '/flagged', label: 'Flagged', hiLabel: 'फ्लैग किए गए', icon: Siren },
  { href: '/growth', label: 'Growth Hub', hiLabel: 'ग्रोथ हब', icon: Rocket },
];

export default function Sidebar({ unreadCount = 3 }: SidebarProps) {
  const router = useRouter();
  const pathname = router.pathname;
  const { user } = useAuthStore();
  const { language, toggleLanguage } = useSettingsStore();

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-[88px] flex-col border-r border-white/10 bg-[#0d111a] px-3 py-6 lg:w-[240px]">
      <div className="mb-8 px-2 text-xl font-black tracking-wider text-white">OVERLINE</div>

      <nav className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/5 hover:text-white',
                active && 'bg-white/10 text-white'
              )}
            >
              <Icon size={18} />
              <span className="hidden lg:inline">{language === 'hi' ? item.hiLabel : item.label}</span>
              {item.href === '/notifications' && unreadCount > 0 && (
                <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] text-white">
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}

        {user?.role === 'SUPER_ADMIN' && (
          <div className="pt-4 mt-4 border-t border-white/10">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2 hidden lg:block">Platform Admin</p>
            <Link
              href="/platform/dashboard"
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/5 hover:text-white',
                pathname === '/platform/dashboard' && 'bg-white/10 text-white'
              )}
            >
              <Shield size={18} />
              <span className="hidden lg:inline">Startup Launch</span>
            </Link>
          </div>
        )}
      </nav>

      <div className="mt-auto space-y-3">
        <button
          onClick={toggleLanguage}
          className="flex items-center justify-center gap-2 w-full rounded-xl border border-white/10 bg-white/5 p-2 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Languages size={14} />
          <span className="hidden lg:inline">{language === 'hi' ? 'English' : 'हिंदी (Hindi)'}</span>
        </button>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
          <p className="font-semibold text-white">The Grooming Lab</p>
          <p className="mt-1">Shop Selector</p>
        </div>
      </div>
    </aside>
  );
}
