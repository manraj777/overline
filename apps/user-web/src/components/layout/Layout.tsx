import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Home, Search, Calendar, User, Menu, X, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { Avatar, Button } from '@/components/ui';
import { useLogout } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { mutate: logoutMutate } = useLogout();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
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
      setScrolled(window.scrollY > 50);
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

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FA] text-[#282D3C]">
      {/* ========================================================= */}
      {/* Floating Navigation Bar                                    */}
      {/* ========================================================= */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 sm:px-6 lg:px-8 pt-6 pb-2 pointer-events-none">
        <div
          className={cn(
            "max-w-7xl mx-auto pointer-events-auto rounded-full transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]",
            scrolled
              ? "bg-white/80 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgb(0,0,0,0.04)] py-3 px-6"
              : "bg-transparent py-4 px-2"
          )}
        >
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-lexo-black flex items-center justify-center transition-transform duration-300 group-hover:scale-95 group-hover:rotate-3">
                <span className="text-white font-bold text-lg">O</span>
              </div>
              <span className="text-2xl font-bold tracking-tight">Overline</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1 bg-white/40 p-1.5 rounded-full border border-gray-200/50">
              {navigation.slice(0, 3).map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300',
                    isActive(item.href)
                      ? 'bg-lexo-black text-white shadow-md'
                      : 'text-lexo-gray hover:text-lexo-charcoal hover:bg-white/60'
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Desktop User Menu */}
            <div className="hidden md:flex items-center gap-3">
              <div className="w-px h-5 bg-gray-200 hidden lg:block mx-1" />

              {isAuthenticated && user ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-3 bg-white/40 border border-gray-200/50 pl-2 pr-4 py-1.5 rounded-full hover:bg-white/80 transition-colors"
                  >
                    <Avatar src={user.avatarUrl || null} name={user.name} size="sm" />
                    <span className="text-sm font-semibold">{user.name.split(' ')[0]}</span>
                  </button>
                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-gray-100 overflow-hidden z-50"
                      >
                        <Link
                          href="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-gray-50 transition-colors"
                        >
                          <User className="w-4 h-4 text-gray-500" />
                          Profile
                        </Link>
                        <button
                          onClick={() => { setUserMenuOpen(false); logoutMutate(); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/auth/login">
                    <Button variant="ghost" className="rounded-full font-semibold hover:bg-white/40 text-lexo-charcoal">
                      Login
                    </Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button className="rounded-full bg-lexo-black text-white hover:bg-lexo-dark shadow-[0_4px_14px_0_rgb(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] transition-all font-semibold">
                      Sign Up
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-full bg-white/60 border border-gray-200/50 hover:bg-white/80 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
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
            className="fixed inset-0 z-40 bg-white/95 backdrop-blur-3xl pt-28 px-6 md:hidden"
          >
            <nav className="flex flex-col gap-4">
              {navigation.map((item, i) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-4 py-4 border-b border-gray-100 text-2xl font-bold tracking-tight',
                      isActive(item.href) ? 'text-lexo-black' : 'text-lexo-gray'
                    )}
                  >
                    <item.icon className="w-8 h-8" />
                    {item.name}
                  </Link>
                </motion.div>
              ))}

              {isAuthenticated && user ? (
                <motion.div
                  className="mt-8 flex flex-col gap-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <button
                    onClick={() => { setMobileMenuOpen(false); logoutMutate(); }}
                    className="w-full flex items-center justify-center gap-3 rounded-full py-5 text-lg font-bold border-2 border-red-200 text-red-600 hover:bg-red-50 transition-colors"
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
                    <Button className="w-full rounded-full bg-lexo-black py-6 text-lg">Sign Up Free</Button>
                  </Link>
                  <Link href="/auth/login" className="w-full">
                    <Button variant="outline" className="w-full rounded-full py-6 text-lg border-2 border-gray-200">
                      Login
                    </Button>
                  </Link>
                </motion.div>
              )}

              {/* Mobile Partner Link Removed */}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 pt-32 pb-20 md:pb-0">{children}</main>

      {/* ========================================================= */}
      {/* Massive Lexogrine Footer                                   */}
      {/* ========================================================= */}
      <footer className="mt-20 px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-7xl mx-auto bg-lexo-black text-white rounded-[2.5rem] p-8 md:p-16 lg:p-24 overflow-hidden relative">

          {/* Abstract Glow Effect inside Footer */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/30 to-purple-600/30 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />

          <div className="relative z-10 grid lg:grid-cols-2 gap-16 lg:gap-8 items-end">
            <div>
              <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8 leading-[1.1]">
                Ready to<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                  book now?
                </span>
              </h2>
              <p className="text-lexo-gray text-lg md:text-xl max-w-md mb-10 leading-relaxed font-medium">
                Skip the line and experience premium grooming. Secure your appointment in seconds.
              </p>
              {/* Footer action buttons removed per request */}
            </div>

            <div className="flex flex-col sm:flex-row justify-between lg:justify-end gap-12 lg:gap-24">
              <div className="space-y-4">
                <h4 className="text-lexo-gray font-semibold tracking-wide uppercase text-sm">Platform</h4>
                <div className="flex flex-col gap-3">
                  <Link href="/explore" className="font-semibold hover:text-indigo-400 transition-colors">Explore</Link>
                  <Link href="/bookings" className="font-semibold hover:text-indigo-400 transition-colors">My Bookings</Link>
                  <Link href="/auth/signup" className="font-semibold hover:text-indigo-400 transition-colors">Create Account</Link>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-lexo-gray font-semibold tracking-wide uppercase text-sm">Legal</h4>
                <div className="flex flex-col gap-3">
                  <a href="#" className="font-semibold hover:text-indigo-400 transition-colors">Privacy Policy</a>
                  <a href="#" className="font-semibold hover:text-indigo-400 transition-colors">Terms of Service</a>
                  <a href={process.env.NEXT_PUBLIC_ADMIN_URL || "https://overline-admin-web.vercel.app"} target="_blank" rel="noreferrer" className="font-semibold hover:text-indigo-400 transition-colors text-white/50">Partner Login</a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-24 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-medium text-lexo-gray relative z-10">
            <p>© {new Date().getFullYear()} Overline. All rights reserved.</p>
            <p>Designed for aesthetics & performance.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
