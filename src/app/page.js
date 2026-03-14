'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const API = process.env.NEXT_PUBLIC_BACKEND_URL;

function PoweredBy() {
  return (
    <div style={{ position: 'fixed', bottom: '1rem', right: '1.25rem', zIndex: 50, opacity: 0.35, transition: 'opacity 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
      onMouseLeave={e => e.currentTarget.style.opacity = '0.35'}>
      <a href="https://thebrainsyndicate.com" target="_blank" rel="noopener noreferrer"
        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
        <span style={{ fontSize: '0.6rem', fontFamily: "'DM Mono', monospace", color: '#8b7355', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Powered by</span>
        <span style={{ fontSize: '0.7rem', fontFamily: "'DM Mono', monospace", color: '#5c4a1e', fontWeight: '500', letterSpacing: '0.06em' }}>The Brain Syndicate</span>
      </a>
    </div>
  );
}

export default function HomePage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return; }
      const { data: userRow } = await supabase.from('users').select('role, can_manage_users').eq('email', session.user.email).single();
      if (!userRow || userRow.role === 'student') { router.push('/student'); return; }
      setCurrentUser({ ...session.user, role: userRow.role, can_manage_users: userRow.can_manage_users });
      fetchSessions();
    });
  }, []);

  async function fetchSessions() {
    try {
      const res = await fetch(API + '/api/sessions');
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function deleteSession(e, sessionId) {
    e.stopPropagation();
    if (!confirm('Delete this session and all its data? This cannot be undone.')) return;
    setDeletingId(sessionId);
    try {
      await fetch(API + '/api/sessions/' + sessionId, { method: 'DELETE' });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      setSelected(prev => { const n = new Set(prev); n.delete(sessionId); return n; });
    } catch (err) { alert('Failed to delete session'); }
    setDeletingId(null);
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} session${selected.size !== 1 ? 's' : ''} and all their data? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      const ids = [...selected];
      const res = await fetch(API + '/api/sessions/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        setSessions(prev => prev.filter(s => !selected.has(s.id)));
        setSelected(new Set());
      } else {
        alert('Bulk delete failed');
      }
    } catch (err) { alert('Bulk delete failed: ' + err.message); }
    setBulkDeleting(false);
  }

  function toggleSelect(e, id) {
    e.stopPropagation();
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleSelectAll() {
    if (selected.size === sessions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sessions.map(s => s.id)));
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const statusColor = (s) => s === 'active' ? '#2d6a4f' : s === 'completed' ? '#5c4a1e' : '#4a4a4a';
  const statusLabel = (s) => s === 'active' ? 'Live' : s === 'completed' ? 'Completed' : 'Pending';
  const allSelected = sessions.length > 0 && selected.size === sessions.length;
  const someSelected = selected.size > 0;

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f3', fontFamily: "'Crimson Pro', Georgia, serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .session-card { background: #fff; border: 1px solid #e8e0d0; border-radius: 4px; padding: 1.25rem 1.75rem; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; gap: 1rem; }
        .session-card:hover { border-color: #8b6914; box-shadow: 0 4px 20px rgba(139,105,20,0.08); transform: translateY(-1px); }
        .session-card.selected { border-color: #8b6914; background: #fdfaf4; }
        .session-card:hover .delete-btn { opacity: 1; }
        .delete-btn { opacity: 0; background: none; border: 1px solid #e0c8c4; border-radius: 3px; padding: 0.25rem 0.5rem; cursor: pointer; color: #8b3a2a; font-size: 0.72rem; font-family: 'DM Mono', monospace; transition: all 0.2s; }
        .delete-btn:hover { background: #fdf3f0; }
        .btn-primary { background: #1a1208; color: #f5edd8; border: none; padding: 0.75rem 1.75rem; font-family: 'Crimson Pro', Georgia, serif; font-size: 1rem; font-weight: 500; cursor: pointer; border-radius: 3px; transition: all 0.2s; }
        .btn-primary:hover { background: #2d1f0a; }
        .btn-danger { background: #8b3a2a; color: #fff; border: none; padding: 0.5rem 1.25rem; font-family: 'Crimson Pro', Georgia, serif; font-size: 0.9rem; cursor: pointer; border-radius: 3px; transition: all 0.2s; }
        .btn-danger:hover { background: #7a3224; }
        .btn-outline { background: transparent; color: #5c4a1e; border: 1px solid #d4c9b0; padding: 0.4rem 0.875rem; font-family: 'Crimson Pro', Georgia, serif; font-size: 0.85rem; cursor: pointer; border-radius: 3px; transition: all 0.2s; }
        .btn-outline:hover { border-color: #8b6914; color: #1a1208; }
        .checkbox { width: 16px; height: 16px; border-radius: 2px; border: 1.5px solid #d4c9b0; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all 0.15s; background: transparent; }
        .checkbox.checked { background: #8b6914; border-color: #8b6914; }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
      `}</style>

      <header style={{ borderBottom: '1px solid #e8e0d0', background: '#fff', padding: '0 3rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1a1208', letterSpacing: '-0.01em' }}>LearnLive</span>
          <span style={{ fontSize: '0.75rem', color: '#8b7355', fontFamily: "'DM Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase' }}>Academic</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {currentUser?.role === 'super_admin' && <button className="btn-outline" onClick={() => router.push('/admin/users')}>Users</button>}
          <button className="btn-outline" onClick={handleSignOut}>Sign Out</button>
          <button className="btn-primary" onClick={() => router.push('/sessions/new')}>+ New Session</button>
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 2rem' }}>
        <div style={{ marginBottom: '3rem' }}>
          <p style={{ fontSize: '0.72rem', fontFamily: "'DM Mono', monospace", color: '#8b7355', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>AI-Powered Discussion Assessment</p>
          <h1 style={{ fontSize: '2.8rem', fontWeight: '300', color: '#1a1208', lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: '1rem' }}>
            Your Learning<br /><em style={{ fontStyle: 'italic', fontWeight: '400' }}>Sessions</em>
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#6b5b3e', maxWidth: '480px', lineHeight: 1.6, fontWeight: '300' }}>
            Facilitate group discussions with real-time AI analysis, Bloom's taxonomy scoring, and comprehensive post-session reports.
          </p>
        </div>

        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #d4c9b0, transparent)', margin: '2rem 0' }} />

        {/* Bulk action bar */}
        {someSelected && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: '#fdf8ec', border: '1px solid #e8d9b8', borderRadius: '4px', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#5c4a1e', flex: 1 }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: '500' }}>{selected.size}</span> session{selected.size !== 1 ? 's' : ''} selected
            </span>
            <button onClick={toggleSelectAll} className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}>
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
            <button onClick={bulkDelete} disabled={bulkDeleting} className="btn-danger" style={{ fontSize: '0.82rem', padding: '0.35rem 1rem' }}>
              {bulkDeleting ? 'Deleting...' : `Delete ${selected.size} selected`}
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#8b7355', fontStyle: 'italic' }}>Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <p style={{ fontSize: '1.2rem', color: '#8b7355', fontStyle: 'italic', marginBottom: '0.75rem' }}>No sessions yet</p>
            <p style={{ fontSize: '0.9rem', color: '#a89878', marginBottom: '2rem', lineHeight: 1.5 }}>Create your first session to get started. The setup wizard will guide you through defining outcomes, uploading materials, and configuring discussion prompts.</p>
            <button className="btn-primary" onClick={() => router.push('/sessions/new')}>Create your first session</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {sessions.map((s, i) => {
              const isSelected = selected.has(s.id);
              return (
                <div key={s.id} className={`session-card${isSelected ? ' selected' : ''}`}
                  onClick={() => router.push(s.status === 'completed' ? '/report/' + s.id : '/admin/' + s.id)}>
                  {/* Checkbox */}
                  <div className={`checkbox${isSelected ? ' checked' : ''}`} onClick={e => toggleSelect(e, s.id)}>
                    {isSelected && <span style={{ color: '#fff', fontSize: '10px', lineHeight: 1 }}>✓</span>}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.5rem', flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '0.72rem', fontFamily: "'DM Mono', monospace", color: '#a89878', minWidth: '24px', flexShrink: 0 }}>
                      {String(sessions.length - i).padStart(2, '0')}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '1.05rem', fontWeight: '500', color: '#1a1208', marginBottom: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                      <div style={{ fontSize: '0.88rem', color: '#6b5b3e', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.topic}</div>
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                        {s.group_name && <span style={{ fontSize: '0.68rem', fontFamily: "'DM Mono', monospace", color: '#8b6914' }}>⬡ {s.group_name}</span>}
                        {s.session_config?.session_type && <span style={{ fontSize: '0.68rem', fontFamily: "'DM Mono', monospace", color: '#a89878', textTransform: 'uppercase' }}>{s.session_config.session_type}</span>}
                        {s.session_config?.objectives?.length > 0 && <span style={{ fontSize: '0.68rem', fontFamily: "'DM Mono', monospace", color: '#5c7a5e' }}>{s.session_config.objectives.length} objective{s.session_config.objectives.length !== 1 ? 's' : ''}</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0, marginLeft: '1rem' }}>
                    <span style={{ fontSize: '0.72rem', color: '#8b7355', fontFamily: "'DM Mono', monospace" }}>
                      {new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span style={{ fontSize: '0.68rem', fontFamily: "'DM Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.25rem 0.6rem', borderRadius: '2px', background: statusColor(s.status) + '18', color: statusColor(s.status), border: '1px solid ' + statusColor(s.status) + '40', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {s.status === 'active' && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#2d6a4f', animation: 'pulse 1.5s infinite', display: 'inline-block' }} />}
                      {statusLabel(s.status)}
                    </span>
                    <button className="delete-btn" onClick={e => deleteSession(e, s.id)} disabled={deletingId === s.id}>
                      {deletingId === s.id ? '...' : 'Delete'}
                    </button>
                    <span style={{ color: '#c9b890' }}>→</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {sessions.length > 0 && (
          <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #e8e0d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.82rem', color: '#a89878', fontFamily: "'DM Mono', monospace" }}>{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span>
              {sessions.length > 1 && (
                <button onClick={toggleSelectAll} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontFamily: "'DM Mono', monospace", color: '#8b7355', padding: 0 }}>
                  {allSelected ? 'Deselect all' : 'Select all'}
                </button>
              )}
            </div>
            <button className="btn-primary" onClick={() => router.push('/sessions/new')}>+ New Session</button>
          </div>
        )}
      </main>
      <PoweredBy />
    </div>
  );
}
