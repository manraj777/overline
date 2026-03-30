'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, BarChart3, Clock3, LayoutDashboard, Settings, Users, UserRound, Siren } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  unreadCount?: number;
}

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/queue', label: 'Queue', icon: Clock3 },
  { href: '/appointments', label: 'Appointments', icon: Users },
  { href: '/customers', label: 'Customers', icon: UserRound },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/flagged', label: 'Flagged', icon: Siren },
];

export default function Sidebar({ unreadCount = 3 }: SidebarProps) {
  const pathname = usePathname();

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
              <span className="hidden lg:inline">{item.label}</span>
              {item.href === '/notifications' && unreadCount > 0 && (
                <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] text-white">
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/70">
        <p className="font-semibold text-white">The Grooming Lab</p>
        <p className="mt-1">Shop Selector</p>
      </div>
    </aside>
  );
}
