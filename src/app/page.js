'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function HomePage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', topic: '' });
  const router = useRouter();

  useEffect(() => {
    fetchSessions();
  }, []);

  async function fetchSessions() {
    try {
      const res = await fetch(API + '/api/sessions');
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function createSession() {
    if (!form.title.trim() || !form.topic.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(API + '/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, topic: form.topic }),
      });
      const data = await res.json();
      router.push('/admin/' + data.id);
    } catch (err) {
      alert('Failed to create session');
    }
    setCreating(false);
  }

  const statusColor = (status) => {
    if (status === 'active') return '#2d6a4f';
    if (status === 'completed') return '#5c4a1e';
    return '#4a4a4a';
  };

  const statusLabel = (status) => {
    if (status === 'active') return 'Live';
    if (status === 'completed') return 'Completed';
    return 'Pending';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#faf8f3',
      fontFamily: "'Crimson Pro', Georgia, serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .session-card {
          background: #fff;
          border: 1px solid #e8e0d0;
          border-radius: 4px;
          padding: 1.5rem 2rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          justify-content: space-between;
          align-items: center;
          text-decoration: none;
        }
        .session-card:hover {
          border-color: #8b6914;
          box-shadow: 0 4px 20px rgba(139,105,20,0.08);
          transform: translateY(-1px);
        }
        .btn-primary {
          background: #1a1208;
          color: #f5edd8;
          border: none;
          padding: 0.75rem 1.75rem;
          font-family: 'Crimson Pro', Georgia, serif;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          border-radius: 3px;
          transition: all 0.2s;
          letter-spacing: 0.02em;
        }
        .btn-primary:hover { background: #2d1f0a; }
        .btn-secondary {
          background: transparent;
          color: #5c4a1e;
          border: 1px solid #c9b890;
          padding: 0.75rem 1.75rem;
          font-family: 'Crimson Pro', Georgia, serif;
          font-size: 1rem;
          cursor: pointer;
          border-radius: 3px;
          transition: all 0.2s;
        }
        .btn-secondary:hover { border-color: #8b6914; color: #1a1208; }
        .input-field {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid #d4c9b0;
          border-radius: 3px;
          font-family: 'Crimson Pro', Georgia, serif;
          font-size: 1.05rem;
          color: #1a1208;
          background: #fdfaf4;
          outline: none;
          transition: border-color 0.2s;
        }
        .input-field:focus { border-color: #8b6914; background: #fff; }
        .input-field::placeholder { color: #a89878; }
        .divider { height: 1px; background: linear-gradient(90deg, transparent, #d4c9b0, transparent); margin: 2rem 0; }
      `}</style>

      {/* Header */}
      <header style={{
        borderBottom: '1px solid #e8e0d0',
        background: '#fff',
        padding: '0 3rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '72px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1a1208', letterSpacing: '-0.01em' }}>LearnLive</span>
          <span style={{ fontSize: '0.8rem', color: '#8b7355', fontFamily: "'DM Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase' }}>Academic</span>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + New Session
        </button>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 2rem' }}>

        {/* Hero */}
        <div style={{ marginBottom: '3rem' }}>
          <p style={{ fontSize: '0.75rem', fontFamily: "'DM Mono', monospace", color: '#8b7355', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>AI-Powered Discussion Assessment</p>
          <h1 style={{ fontSize: '2.8rem', fontWeight: '300', color: '#1a1208', lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: '1rem' }}>
            Your Learning<br /><em style={{ fontStyle: 'italic', fontWeight: '400' }}>Sessions</em>
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#6b5b3e', maxWidth: '480px', lineHeight: 1.6, fontWeight: '300' }}>
            Facilitate group discussions with real-time AI analysis, Bloom's taxonomy scoring, and comprehensive post-session reports.
          </p>
        </div>

        <div className="divider" />

        {/* Create Form Modal */}
        {showForm && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(26,18,8,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
            backdropFilter: 'blur(4px)',
          }}>
            <div style={{
              background: '#fdfaf4', border: '1px solid #d4c9b0',
              borderRadius: '6px', padding: '2.5rem', width: '100%', maxWidth: '480px',
              boxShadow: '0 20px 60px rgba(26,18,8,0.2)',
            }}>
              <h2 style={{ fontSize: '1.6rem', fontWeight: '400', color: '#1a1208', marginBottom: '0.5rem' }}>New Session</h2>
              <p style={{ color: '#8b7355', fontSize: '0.95rem', marginBottom: '2rem' }}>Set the title and discussion topic for this learning session.</p>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontFamily: "'DM Mono', monospace", color: '#5c4a1e', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Session Title</label>
                <input className="input-field" placeholder="e.g. Week 4 — Ethical Frameworks" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontFamily: "'DM Mono', monospace", color: '#5c4a1e', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Discussion Topic</label>
                <input className="input-field" placeholder="e.g. Kantian Ethics and moral duty" value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} onKeyDown={e => e.key === 'Enter' && createSession()} />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn-primary" onClick={createSession} disabled={creating} style={{ flex: 1 }}>
                  {creating ? 'Creating...' : 'Create Session'}
                </button>
                <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Sessions List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#8b7355', fontStyle: 'italic' }}>Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <p style={{ fontSize: '1.2rem', color: '#8b7355', fontStyle: 'italic', marginBottom: '1rem' }}>No sessions yet</p>
            <p style={{ color: '#a89878', fontSize: '0.95rem' }}>Create your first session to get started.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {sessions.map((s, i) => (
              <div key={s.id} className="session-card" onClick={() => router.push(s.status === 'completed' ? '/report/' + s.id : '/admin/' + s.id)}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontFamily: "'DM Mono', monospace", color: '#a89878', minWidth: '24px' }}>
                    {String(sessions.length - i).padStart(2, '0')}
                  </span>
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '500', color: '#1a1208', marginBottom: '0.2rem' }}>{s.title}</div>
                    <div style={{ fontSize: '0.9rem', color: '#6b5b3e', fontStyle: 'italic' }}>{s.topic}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.75rem', color: '#8b7355', fontFamily: "'DM Mono', monospace" }}>
                    {new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span style={{
                    fontSize: '0.7rem', fontFamily: "'DM Mono', monospace", letterSpacing: '0.1em',
                    textTransform: 'uppercase', padding: '0.3rem 0.75rem', borderRadius: '2px',
                    background: statusColor(s.status) + '18',
                    color: statusColor(s.status),
                    border: '1px solid ' + statusColor(s.status) + '40',
                  }}>
                    {s.status === 'active' && <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#2d6a4f', marginRight: '6px', animation: 'pulse 1.5s infinite' }} />}
                    {statusLabel(s.status)}
                  </span>
                  <span style={{ color: '#c9b890', fontSize: '1.2rem' }}>→</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {sessions.length > 0 && (
          <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #e8e0d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#a89878', fontFamily: "'DM Mono', monospace" }}>
              {sessions.length} session{sessions.length !== 1 ? 's' : ''}
            </span>
            <button className="btn-primary" onClick={() => setShowForm(true)}>+ New Session</button>
          </div>
        )}
      </main>
    </div>
  );
}
