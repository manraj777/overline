'use client';

import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface HeaderProps {
  city?: string;
}

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Explore', href: '/explore' },
  { label: 'Bookings', href: '/bookings' },
];

export default function Header({ city = 'Bhopal' }: HeaderProps) {
  const router = useRouter();
  const pathname = router.pathname;
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { t, i18n } = useTranslation('common');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const drawer = useMemo(() => ({ close: () => setIsOpen(false) }), []);

  const navigateAndClose = (href: string) => {
    drawer.close();
    router.push(href);
  };

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled ? 'bg-black/60 backdrop-blur-xl border-b border-white/15' : 'bg-black/20 backdrop-blur-md'
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-xl font-bold tracking-wider text-white">
          OVERLINE
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm tracking-wide transition-colors',
                  active ? 'text-white' : 'text-white/60 hover:text-white'
                )}
              >
                {t(`header.${link.label.toLowerCase()}`, link.label)}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <button
            onClick={() => i18n.changeLanguage(i18n.language?.startsWith('en') ? 'hi' : 'en')}
            className="rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-white/80 hover:bg-white/10 transition-colors"
          >
            {i18n.language?.startsWith('en') ? 'हिंदी' : 'EN'}
          </button>
          <span className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80">{t('header.exploringIn')} {city}</span>
          <Link href="/auth" className="rounded-full border border-white/25 px-4 py-2 text-sm text-white/80 hover:text-white">
            {t('header.login')}
          </Link>
          <Link href="/auth" className="rounded-full bg-[#f6bd60] px-4 py-2 text-sm font-semibold text-black">
            {t('header.signUp')}
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full border border-white/25 p-2 text-white md:hidden"
          aria-label="Open menu"
          onClick={() => setIsOpen(true)}
        >
          <Menu size={20} />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed inset-0 bg-[#070a10] p-6 md:hidden"
          >
            <div className="mb-10 flex items-center justify-between">
              <span className="text-lg font-bold tracking-wider">Menu</span>
              <button
                type="button"
                className="rounded-full border border-white/20 p-2"
                onClick={() => drawer.close()}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 text-xl">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  type="button"
                  className="block w-full text-left text-white"
                  onClick={() => navigateAndClose(link.href)}
                >
                  {link.label}
                </button>
              ))}
            </div>

            <div className="mt-12 grid gap-3">
              <button
                type="button"
                className="rounded-xl border border-white/20 px-4 py-3 text-left"
                onClick={() => {
                  drawer.close();
                  router.push('/auth?mode=login');
                }}
              >
                Login
              </button>
              <button
                type="button"
                className="rounded-xl bg-[#f6bd60] px-4 py-3 text-left font-semibold text-black"
                onClick={() => {
                  drawer.close();
                  router.push('/auth?mode=signup');
                }}
              >
                Sign Up
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
