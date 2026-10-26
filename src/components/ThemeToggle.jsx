import { HiOutlineMoon, HiOutlineSun } from 'react-icons/hi';

// Controlled by the Navbar, so the bar button and the mobile-menu item always agree
export default function ThemeToggle({ theme, onToggle, className = '', label = false }) {
  const isDark = theme === 'dark';
  const text = isDark ? 'Light theme' : 'Black theme';
  return (
    <button className={className} onClick={onToggle} title={`Switch to ${text.toLowerCase()}`} aria-label={`Switch to ${text.toLowerCase()}`}>
      {isDark ? <HiOutlineSun /> : <HiOutlineMoon />}
      {label && <span className="theme-toggle__label">{text}</span>}
    </button>
  );
}
