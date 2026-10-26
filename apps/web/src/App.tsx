import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { LiveRoomPage } from './pages/LiveRoomPage';
import { HistoryPage } from './pages/HistoryPage';
import { DeveloperPage } from './pages/DeveloperPage';
import { DocsPage } from './pages/DocsPage';
import { ProjectAssistant } from './components/ProjectAssistant';
import { AuthGate } from './components/AuthGate';
import { firebaseAuth } from './services/firebase';
import { fetchHealth } from './services/api';

export function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [currentPage, setCurrentPage] = useState<string>('landing');
  const [pageParams, setPageParams] = useState<Record<string, string>>({});
  const [isMockMode, setIsMockMode] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Check initial theme from localStorage
    const savedTheme = localStorage.getItem('sunosamjho-theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
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
    return onAuthStateChanged(firebaseAuth, (user) => {
      setIsAuthenticated(Boolean(user?.emailVerified));
      setAuthLoading(false);
    });
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (authLoading) {
    return <div className="auth-loading" role="status">Preparing your secure SunoSamjho session…</div>;
  }

  if (!isAuthenticated) {
    return <AuthGate onVerified={() => setIsAuthenticated(true)} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        currentPage={currentPage}
        navigate={navigate}
        isMockMode={isMockMode}
        onSignOut={() => { if (firebaseAuth) void signOut(firebaseAuth); }}
      />

      <main style={{ flex: 1 }}>
        {currentPage === 'landing' && <LandingPage navigate={navigate} />}
        {currentPage === 'live' && (
          <LiveRoomPage initialRoomCode={pageParams.code} navigate={navigate} />
        )}
        {currentPage === 'history' && <HistoryPage navigate={navigate} />}
        {currentPage === 'developers' && <DeveloperPage navigate={navigate} />}
        {currentPage === 'docs' && <DocsPage />}
      </main>

      <Footer navigate={navigate} />
      <ProjectAssistant />
    </div>
  );
}

export default App;
