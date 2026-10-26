import { useState, useEffect } from 'react';
import { HiOutlineMoon, HiOutlineSun } from 'react-icons/hi';
import { currentTheme, savedTheme, applyTheme } from '../utils/theme';

export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(currentTheme);

  // Until someone picks a theme, keep following the device's light/dark setting
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => {
      if (savedTheme()) return;
      const next = e.matches ? 'dark' : 'light';
      applyTheme(next, { save: false });
      setTheme(next);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
  };

  const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to black theme';
  return (
    <button className={className} onClick={toggle} title={label} aria-label={label}>
      {theme === 'dark' ? <HiOutlineSun /> : <HiOutlineMoon />}
    </button>
  );
}
