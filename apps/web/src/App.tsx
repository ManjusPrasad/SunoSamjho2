import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { LiveRoomPage } from './pages/LiveRoomPage';
import { HistoryPage } from './pages/HistoryPage';
import { DeveloperPage } from './pages/DeveloperPage';
import { DocsPage } from './pages/DocsPage';
import { AdvisoryPage } from './pages/AdvisoryPage';
import { ProjectAssistant } from './components/ProjectAssistant';
import { AuthGate } from './components/AuthGate';
import { firebaseAuth } from './services/firebase';
import { fetchHealth } from './services/api';
import { useThemeStore } from './stores/themeStore';

export function App() {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const [currentPage, setCurrentPage] = useState<string>('landing');
  const [pageParams, setPageParams] = useState<Record<string, string>>({});
  const [isMockMode, setIsMockMode] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('gnaniflow-access') === 'true';
  });
  // If already authenticated via localStorage, skip loading spinner entirely
  const [authLoading, setAuthLoading] = useState(() => {
    return localStorage.getItem('gnaniflow-access') !== 'true';
  });

  useEffect(() => {
    // Check initial theme from localStorage
    const savedTheme = localStorage.getItem('sunosamjho-theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }

    // Check health & provider status
    fetchHealth()
      .then((data) => {
        if (data.provider?.isMock) {
          setIsMockMode(true);
        }
      })
      .catch(() => {});

    // Parse URL params (e.g. ?code=SJ-XXXXX)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      setCurrentPage('live');
      setPageParams({ code });
    }
  }, []);

  useEffect(() => {
    if (!firebaseAuth) {
      setAuthLoading(false);
      return;
    }
    // Safety timeout — never hang on loading screen more than 4s
    const timeout = setTimeout(() => setAuthLoading(false), 4000);
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      clearTimeout(timeout);
      if (user?.emailVerified) {
        setIsAuthenticated(true);
        localStorage.setItem('gnaniflow-access', 'true');
      } else if (localStorage.getItem('gnaniflow-access') === 'true') {
        // User was previously authenticated (e.g. just came through AuthGate)
        setIsAuthenticated(true);
      }
      setAuthLoading(false);
    });
    return () => { clearTimeout(timeout); unsubscribe(); };
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('sunosamjho-theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const navigate = (page: string, params: Record<string, string> = {}) => {
    setCurrentPage(page);
    setPageParams(params);
    const nextUrl = new URL(window.location.href);
    if (page === 'live' && params.code) nextUrl.searchParams.set('code', params.code);
    else nextUrl.searchParams.delete('code');
    window.history.replaceState({}, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  if (authLoading) {
    return <div className="auth-loading" role="status">Preparing your KisanSaathi session…</div>;
  }

  if (!isAuthenticated) {
    return (
      <AuthGate
        onVerified={() => {
          localStorage.setItem('gnaniflow-access', 'true');
          setIsAuthenticated(true);
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        currentPage={currentPage}
        navigate={navigate}
        isMockMode={isMockMode}
        onSignOut={() => {
          localStorage.removeItem('gnaniflow-access');
          setIsAuthenticated(false);
          if (firebaseAuth) void signOut(firebaseAuth);
        }}
      />

      <main className="app-main">
        {currentPage === 'landing' && <LandingPage navigate={navigate} />}
        {currentPage === 'live' && (
          <LiveRoomPage initialRoomCode={pageParams.code} navigate={navigate} />
        )}
        {currentPage === 'history' && <HistoryPage navigate={navigate} />}
        {currentPage === 'developers' && <DeveloperPage navigate={navigate} />}
        {currentPage === 'docs' && <DocsPage />}
        {currentPage === 'advisory' && <AdvisoryPage navigate={navigate} />}
      </main>

      <Footer navigate={navigate} />
      <ProjectAssistant />
    </div>
  );
}

export default App;
