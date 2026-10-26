import React, { useState, useEffect } from 'react';
import { Search, Trash2, Download, Eye, FileText, ArrowLeft, Clock, Globe } from 'lucide-react';
import { fetchHistory, fetchTranscript, deleteTranscript } from '../services/api';

interface HistoryPageProps {
  navigate: (page: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ navigate }) => {
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTranscript, setSelectedTranscript] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [exportError, setExportError] = useState('');

  const loadData = (query?: string) => {
    setIsLoading(true);
    fetchHistory(query)
      .then((data) => {
        if (data.transcripts) setTranscripts(data.transcripts);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(searchQuery);
  };

  const handleView = async (id: string) => {
    const data = await fetchTranscript(id);
    if (data.transcript) {
      setSelectedTranscript(data.transcript);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to permanently delete this conversation transcript?')) {
      await deleteTranscript(id);
      setTranscripts((prev) => prev.filter((t) => t.id !== id));
      if (selectedTranscript?.id === id) {
        setSelectedTranscript(null);
      }
    }
  };

  const handleExport = async (id: string, format: 'txt' | 'json') => {
    setExportError('');
    try {
      const response = await fetch(`/api/v1/history/${encodeURIComponent(id)}/export?format=${format}`);
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error?.message || 'Could not download this transcript.');
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = `sunosamjho-transcript-${id}.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Could not download this transcript.');
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px 80px' }}>
      {/* HEADER */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>
          Conversation History
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Review, search, export, or permanently delete past conversation transcripts.
          In accordance with our privacy-first principles, zero raw audio is ever stored.
        </p>
      </div>

      {exportError && <div role="alert" className="room-reconnect-note error" style={{ marginBottom: '20px' }}>{exportError}</div>}

      {selectedTranscript ? (
        /* DETAIL VIEW */
        <div
          className="glass-panel"
          style={{
            padding: '28px',
            background: 'var(--bg-secondary)',
            borderRadius: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <button
              onClick={() => setSelectedTranscript(null)}
              className="btn btn-sm btn-secondary"
            >
              <ArrowLeft size={14} />
              <span>Back to Transcripts</span>
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleExport(selectedTranscript.id, 'txt')}
                className="btn btn-sm btn-secondary"
              >
                <Download size={14} />
                <span>Export TXT</span>
              </button>
              <button
                onClick={() => handleExport(selectedTranscript.id, 'json')}
                className="btn btn-sm btn-secondary"
              >
                <Download size={14} />
                <span>Export JSON</span>
              </button>
              <button
                onClick={() => handleDelete(selectedTranscript.id)}
                className="btn btn-sm btn-danger"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '6px' }}>
              {selectedTranscript.title}
            </h2>
            <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={14} /> {new Date(selectedTranscript.createdAt).toLocaleString()}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Globe size={14} /> {selectedTranscript.sourceLanguage} ↔ {selectedTranscript.targetLanguage}
              </span>
            </div>
          </div>

          {/* UTTERANCES LIST */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {selectedTranscript.messages.map((m: any, idx: number) => (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-primary)',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '0.9rem' }}>{m.speakerLabel} ({m.sourceLanguage})</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(m.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.95rem' }}>
                  "{m.originalText}"
                </div>
                <div
                  style={{
                    background: 'var(--bg-tertiary)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  "{m.translatedText}"
                </div>
                {m.explanationText && (
                  <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--accent-emerald)' }}>
                    Plain note: {m.explanationText}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* LIST VIEW */
        <>
          {/* SEARCH BAR */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                placeholder="Search transcripts by title or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-strong)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.925rem',
                  outline: 'none',
                }}
              />
            </div>
            <button type="submit" className="btn btn-primary">
              <span>Search</span>
            </button>
          </form>

          {/* LIST */}
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Loading transcripts...
            </div>
          ) : transcripts.length === 0 ? (
            <div
              className="glass-panel"
              style={{
                textAlign: 'center',
                padding: '48px 24px',
                background: 'var(--bg-secondary)',
                borderRadius: '16px',
                color: 'var(--text-muted)',
              }}
            >
              <FileText size={42} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '6px' }}>
                No conversation transcripts found
              </h3>
              <p style={{ fontSize: '0.875rem' }}>
                Completed live conversations with transcripts enabled will appear here.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {transcripts.map((t) => (
                <div
                  key={t.id}
                  className="glass-panel"
                  style={{
                    padding: '20px 24px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px',
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '4px' }}>
                      {t.title}
                    </h3>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                      <span>·</span>
                      <span>{t.sourceLanguage} ↔ {t.targetLanguage}</span>
                      <span>·</span>
                      <span>{t.totalMessages} utterances</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => handleView(t.id)}
                      className="btn btn-sm btn-secondary"
                    >
                      <Eye size={14} />
                      <span>View</span>
                    </button>
                    <button
                      onClick={() => handleExport(t.id, 'txt')}
                      className="btn btn-sm btn-secondary"
                      title="Export as TXT"
                    >
                      <Download size={14} />
                      <span>TXT</span>
                    </button>
                    <button
                      onClick={() => handleExport(t.id, 'json')}
                      className="btn btn-sm btn-secondary"
                      title="Export as JSON"
                    >
                      <Download size={14} />
                      <span>JSON</span>
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="btn btn-sm btn-danger"
                      title="Delete transcript"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
