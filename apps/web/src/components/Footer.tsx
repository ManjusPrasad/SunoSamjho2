import React from 'react';
import { Mic, Shield, Sparkles, Terminal } from 'lucide-react';

interface FooterProps {
  navigate: (page: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ navigate }) => {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-secondary)',
        padding: '48px 24px 32px',
        marginTop: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '32px',
          marginBottom: '40px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'var(--brand-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <Mic size={16} />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>SunoSamjho Live</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
            Open-source real-time multilingual voice communication platform. Break language barriers
            and converse naturally across Indian languages.
          </p>
        </div>

        <div>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>
            Products
          </h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>
              <button
                onClick={() => navigate('live')}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem' }}
              >
                Live Room
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate('history')}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem' }}
              >
                Conversation History
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate('developers')}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem' }}
              >
                Developer API
              </button>
            </li>
          </ul>
        </div>

        <div>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>
            Architecture & Privacy
          </h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={14} color="var(--accent-emerald)" />
              <span>Zero Raw Audio Persistence</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} color="var(--brand-primary)" />
              <span>Gnani Prisma, Evon & Timbre</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Terminal size={14} color="var(--accent-cyan)" />
              <span>@sunosamjho/sdk</span>
            </li>
          </ul>
        </div>
      </div>

      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
        }}
      >
        <span>© {new Date().getFullYear()} SunoSamjho Live. Built for multilingual real-time conversation.</span>
        <span>Secure server-side credentials · Low-latency Indic audio</span>
      </div>
    </footer>
  );
};
