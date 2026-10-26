import React from 'react';
import { Mic, Sun, Moon, Radio, FileText, Code2, History, LogOut } from 'lucide-react';

interface HeaderProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  currentPage: string;
  navigate: (page: string) => void;
  isMockMode?: boolean;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  toggleTheme,
  currentPage,
  navigate,
  isMockMode,
  onSignOut,
}) => {
  return (
    <header className="app-header">
      <button className="brand-lockup" onClick={() => navigate('landing')} aria-label="SunoSamjho home">
        <span className="brand-mark">
          <Mic size={20} />
        </span>
        <span className="brand-name">SunoSamjho<span className="brand-live">LIVE</span></span>
      </button>

      <nav className="header-nav" aria-label="Main navigation">
        <button
          onClick={() => navigate('live')}
          className={`nav-link ${currentPage === 'live' ? 'active' : ''}`}
        >
          <Radio size={14} />
          <span>Live Room</span>
        </button>

        <button
          onClick={() => navigate('history')}
          className={`nav-link ${currentPage === 'history' ? 'active' : ''}`}
        >
          <History size={14} />
          <span>History</span>
        </button>

        <button
          onClick={() => navigate('developers')}
          className={`nav-link ${currentPage === 'developers' ? 'active' : ''}`}
        >
          <Code2 size={14} />
          <span>Developers</span>
        </button>

        <button
          onClick={() => navigate('docs')}
          className={`nav-link ${currentPage === 'docs' ? 'active' : ''}`}
        >
          <FileText size={14} />
          <span>Docs</span>
        </button>
      </nav>

      <div className="header-controls">
        {isMockMode && (
          <div className="mock-indicator"
            title="Running in local simulation mode. Supply Gnani credentials to switch to real AI services."
          >
            <span className="mock-dot" />
            <span>MOCK MODE</span>
          </div>
        )}

        {onSignOut && (
          <button onClick={onSignOut} className="theme-toggle" aria-label="Sign out" title="Sign out">
            <LogOut size={17} />
          </button>
        )}

        <button
          onClick={toggleTheme}
          className="theme-toggle"
          aria-label="Toggle light/dark theme"
          title="Toggle light/dark theme"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </header>
  );
};
