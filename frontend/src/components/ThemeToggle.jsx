import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../i18n';
import { FaSun, FaMoon } from 'react-icons/fa';

const ThemeToggle = ({ variant = 'default', className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === 'dark';

  const label = isDark
    ? t('theme.light', 'Switch to Light Mode')
    : t('theme.dark', 'Switch to Dark Mode');

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={`
        relative inline-flex items-center justify-center
        w-9 h-9 rounded-xl cursor-pointer outline-none select-none
        transition-all duration-200 ease-in-out
        ${
          variant === 'darkHeader'
            ? 'text-amber-300 hover:text-amber-200 bg-white/10 hover:bg-white/15 border border-white/15'
            : isDark
            ? 'text-amber-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 shadow-sm'
            : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 shadow-xs'
        }
        ${className}
      `}
    >
      <span className="text-[1.05rem] transition-transform duration-300 transform active:scale-90">
        {isDark ? (
          <FaSun className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
        ) : (
          <FaMoon className="text-slate-600" />
        )}
      </span>
    </button>
  );
};

export default ThemeToggle;
