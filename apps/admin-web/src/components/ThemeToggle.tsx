import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';

export const ThemeToggle = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, systemTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-10 h-10" />;
  }

  const currentTheme = theme === 'system' ? systemTheme : theme;

  return (
    <button
      onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
      className="relative flex items-center justify-center w-10 h-10 rounded-full bg-surface-container-low hover:bg-surface-container-high transition-colors text-on-surface hover:text-primary active:scale-90 shadow-sm border border-outline-variant/10"
      aria-label="Toggle Dark Mode"
    >
      <motion.div
        initial={false}
        animate={{ scale: currentTheme === 'dark' ? 1 : 0, opacity: currentTheme === 'dark' ? 1 : 0, rotate: currentTheme === 'dark' ? 0 : 90 }}
        transition={{ duration: 0.2 }}
        className="absolute"
      >
        <Moon className="w-4 h-4" />
      </motion.div>

      <motion.div
        initial={false}
        animate={{ scale: currentTheme === 'light' ? 1 : 0, opacity: currentTheme === 'light' ? 1 : 0, rotate: currentTheme === 'light' ? 0 : -90 }}
        transition={{ duration: 0.2 }}
        className="absolute"
      >
        <Sun className="w-4 h-4" />
      </motion.div>
    </button>
  );
};
