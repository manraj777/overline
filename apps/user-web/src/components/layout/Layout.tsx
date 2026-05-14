import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { Home, Search, Calendar, User, Menu, X, LogOut, Bell, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { useBookingStore } from '@/stores/booking';
import { Avatar, Button } from '@/components/ui';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useLogout } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';

const ChatWidget = dynamic(
  () => import('@/components/chat/ChatWidget').then(m => m.ChatWidget),
  { ssr: false }
);

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const selectedServicesCount = useBookingStore((state) => state.selectedServices.length);
  const { mutate: logoutMutate } = useLogout();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Explore', href: '/explore', icon: Search },
    { name: 'Bookings', href: '/bookings', icon: Calendar },
    { name: 'Profile', href: '/profile', icon: User },
  ];

  const isActive = (href: string) => {
    if (href === '/') return router.pathname === '/';
    return router.pathname.startsWith(href);
  };

  // Hide layout on auth pages
  const isAuthPage = router.pathname.startsWith('/auth');
  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="ovl-app-bg flex flex-col min-h-screen text-on-surface">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Top Navigation Bar — M3 Glassmorphism                      */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <header
        className={cn(
          'fixed top-0 w-full z-50 transition-all duration-500',
          scrolled ? 'glass-header shadow-glass' : 'bg-transparent'
        )}
      >
        <div className="flex justify-between items-center px-4 sm:px-6 lg:px-8 h-16 max-w-[1440px] mx-auto w-full">
          {/* Left: Logo & Nav */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group" aria-label="Overline home">
              <span className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 shadow-button">
                <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20" aria-hidden="true" />
                <span className="block w-3.5 h-0.5 bg-white rounded-full" aria-hidden="true" />
              </span>
              <span className="text-lg font-black tracking-tight text-on-surface group-hover:text-primary transition-colors">Overline</span>
            </Link>
                      
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.slice(0, 3).map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'px-4 py-2 text-sm font-medium transition-all duration-200 h-16 flex items-center',
                    isActive(item.href)
                      ? 'text-primary font-bold border-b-2 border-primary'
                      : 'text-on-surface-variant hover:text-primary'
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
            
            {/* Notifications */}
            <button
              onClick={() => router.push('/profile/notifications')}
              aria-label="Open notifications"
              className="p-2 text-on-surface-variant hover:text-primary rounded-full hover:bg-surface-container-high transition-all active:scale-90"
            >
              <Bell className="w-5 h-5" />
            </button>

            {/* Cart */}
            <button
              onClick={() => router.push('/cart')}
              aria-label="Open cart"
              className="relative p-2 text-on-surface-variant hover:text-primary rounded-full hover:bg-surface-container-high transition-all active:scale-90"
            >
              <ShoppingCart className="w-5 h-5" />
              {selectedServicesCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center">
                  {selectedServicesCount}
                </span>
              )}
            </button>

            {/* User Menu */}
            {isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-fixed-dim bg-surface-container hover:ring-2 hover:ring-primary/20 transition-all"
                >
                  <Avatar src={user.avatarUrl || null} name={user.name} size="sm" />
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-60 bg-surface-container-lowest rounded-2xl shadow-glass-strong border border-outline-variant/40 overflow-hidden z-50"
                    >
                      <div className="p-4 border-b border-outline-variant/40 bg-gradient-to-br from-primary/5 to-transparent">
                        <p className="font-bold text-sm text-on-surface truncate">{user.name}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5 truncate">{user.email || user.phone || ''}</p>
                      </div>
                      <Link
                        href="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-surface-container-low transition-colors"
                      >
                        <User className="w-4 h-4 text-on-surface-variant" />
                        Profile
                      </Link>
                      <button
                        onClick={() => { setUserMenuOpen(false); logoutMutate(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-error hover:bg-error-container/30 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link href="/auth/login">
                  <Button variant="ghost" size="md">Login</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button variant="primary" size="md">Sign Up</Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              className="md:hidden p-2 rounded-full bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-surface/95 backdrop-blur-3xl pt-28 px-6 md:hidden"
          >
            <nav className="flex flex-col gap-2">
              {navigation.map((item, i) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-4 py-4 px-4 rounded-2xl text-lg font-bold tracking-tight transition-all',
                      isActive(item.href)
                        ? 'text-primary bg-primary-fixed/30'
                        : 'text-on-surface-variant hover:bg-surface-container-low'
                    )}
                  >
                    <item.icon className="w-6 h-6" />
                    {item.name}
                  </Link>
                </motion.div>
              ))}

              {isAuthenticated && user ? (
                <motion.div
                  className="mt-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <button
                    onClick={() => { setMobileMenuOpen(false); logoutMutate(); }}
                    className="w-full flex items-center justify-center gap-3 rounded-xl py-4 text-base font-bold border border-error/20 text-error hover:bg-error-container/20 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  className="mt-8 flex flex-col gap-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <Link href="/auth/signup" className="w-full">
                    <Button variant="primary" size="xl" fullWidth>Sign Up Free</Button>
                  </Link>
                  <Link href="/auth/login" className="w-full">
                    <Button variant="outline" size="xl" fullWidth>Login</Button>
                  </Link>
                </motion.div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 pt-16 pb-20 md:pb-0">{children}</main>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Footer — M3 Premium Dark                                   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <footer className="mt-16 px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-7xl mx-auto bg-inverse-surface text-inverse-on-surface rounded-4xl p-8 md:p-16 lg:p-24 overflow-hidden relative">
          {/* Abstract Glow */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-primary/20 to-secondary/20 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />

          <div className="relative z-10 grid lg:grid-cols-2 gap-16 lg:gap-8 items-end">
            <div className="space-y-4">
              <h4 className="text-inverse-on-surface/40 font-semibold tracking-wide uppercase text-sm">About</h4>
              <div className="text-inverse-on-surface/60 text-lg max-w-sm mb-10 leading-relaxed font-medium space-y-4">
                <p>Overline is a premium booking platform for salons, clinics, and spas.</p>
                <p>We use Google Sign-In to securely manage your appointments.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between lg:justify-end gap-12 lg:gap-24">
              <div className="space-y-4">
                <h4 className="text-inverse-on-surface/40 font-semibold tracking-wide uppercase text-sm">Platform</h4>
                <div className="flex flex-col gap-3">
                  <Link href="/explore" className="font-semibold hover:text-inverse-primary transition-colors">Explore</Link>
                  <Link href="/bookings" className="font-semibold hover:text-inverse-primary transition-colors">My Bookings</Link>
                  <Link href="/auth/signup" className="font-semibold hover:text-inverse-primary transition-colors">Create Account</Link>
                  <Link href="/blog" className="font-semibold hover:text-inverse-primary transition-colors">Blog</Link>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-inverse-on-surface/40 font-semibold tracking-wide uppercase text-sm">Legal</h4>
                <div className="flex flex-col gap-3">
                  <Link href="/privacy" className="font-semibold hover:text-inverse-primary transition-colors">Privacy Policy</Link>
                  <Link href="/terms" className="font-semibold hover:text-inverse-primary transition-colors">Terms of Service</Link>
                  <a href="mailto:support@overline.in" className="font-semibold hover:text-inverse-primary transition-colors">Support</a>
                  <a href="https://admin.overline.in" target="_blank" rel="noreferrer" className="font-semibold hover:text-inverse-primary transition-colors text-inverse-on-surface/30">
                    Partner Login
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-24 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-medium text-inverse-on-surface/40 relative z-10 w-full">
            <p>© {new Date().getFullYear()} Overline. All rights reserved.</p>
            <div className="flex flex-col md:items-end text-center md:text-right gap-1">
              <p>Engineered for performance.</p>
              <p className="text-[10px] text-inverse-on-surface/20">Overline uses Google Identity Services for secure authentication. View our Privacy Policy to see how we protect your data.</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Bottom Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-3 glass-header border-t border-outline-variant/40 shadow-nav rounded-t-3xl">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center px-4 py-2 rounded-2xl transition-all active:scale-90 duration-150',
              isActive(item.href)
                ? 'bg-primary-fixed/40 text-primary dark:bg-primary-900/30 dark:text-primary-300'
                : 'text-on-surface-variant hover:text-primary'
            )}
          >
            <item.icon className={cn('w-5 h-5 mb-0.5', isActive(item.href) && 'fill-primary/10')} />
            <span className="text-[11px] font-semibold tracking-wide uppercase">{item.name}</span>
          </Link>
        ))}
      </nav>

      {/* AI Chat Widget (homepage only) */}
      {router.pathname === '/' && <ChatWidget />}
    </div>
  );
};

export default Layout;
