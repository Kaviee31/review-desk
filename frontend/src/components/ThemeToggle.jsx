import { useState, useEffect, useCallback } from 'react';

/**
 * ThemeToggle — toggles light/dark mode.
 *
 * Behaviour:
 *  - On mount: reads localStorage.theme ('light' | 'dark').
 *    Falls back to OS preference via prefers-color-scheme.
 *  - On click: flips theme, adds/removes .dark on <html>, persists to localStorage.
 */
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  /* Apply a theme value to the DOM and persist it */
  const applyTheme = useCallback((isDark) => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    setDark(isDark);
  }, []);

  /* Read saved preference on mount */
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      applyTheme(true);
    } else if (saved === 'light') {
      applyTheme(false);
    } else {
      /* No saved preference — use OS setting */
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(prefersDark);
    }
  }, [applyTheme]);

  return (
    <button
      className="theme-toggle-btn"
      onClick={() => applyTheme(!dark)}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      {dark ? '☀' : '☾'}
    </button>
  );
}
