'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const API = process.env.NEXT_PUBLIC_BACKEND_URL;

const ALLOWED_DOMAINS = ['edu', 'ac.uk', 'ivey.ca', 'uwo.ca', 'insead.edu'];

function isValidDomain(email) {
  const domain = email.split('@')[1] || '';
  return ALLOWED_DOMAINS.some(d => domain === d || domain.endsWith('.' + d));
}


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

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [invite, setInvite] = useState({ email: '', name: '', role: 'student' });
  const [inviting, setInviting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  async function checkAuthAndLoad() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', session.user.email)
      .single();

    if (!user || user.role === 'student') {
      router.push('/');
      return;
    }
    setCurrentUser(user);
    fetchUsers();
  }

  async function fetchUsers() {
    const { data } = await supabase
      .from('users')
      .select('id, email, name, role, can_manage_users, created_at, last_login')
      .order('created_at', { ascending: false });
    setUsers(data || []);
    setLoading(false);
  }

  async function inviteUser() {
    setError('');
    if (!invite.email || !invite.name) { setError('Email and name are required'); return; }
    if (!isValidDomain(invite.email)) { setError('Email domain not allowed. Must be an institutional address.'); return; }

    setInviting(true);
    try {
      const res = await fetch(API + '/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invite),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(`Invitation sent to ${invite.email}`);
      setInvite({ email: '', name: '', role: 'student' });
      setShowInvite(false);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
    setInviting(false);
  }

  async function deleteUser(userId) {
    if (!confirm('Remove this user? They will no longer be able to log in.')) return;
    setDeletingId(userId);
    try {
      const res = await fetch(API + '/api/users/' + userId, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setSuccess('User removed successfully.');
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setDeletingId(null);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const roleColor = (role) => role === 'super_admin' ? '#8b3a2a' : role === 'staff' ? '#8b6914' : '#2d6a4f';
  const roleLabel = (role) => role === 'super_admin' ? 'Super Admin' : role === 'staff' ? 'Staff' : 'Student';

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f3', fontFamily: "'Crimson Pro', Georgia, serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .btn { border: none; border-radius: 3px; cursor: pointer; font-family: 'Crimson Pro', Georgia, serif; font-size: 0.95rem; padding: 0.6rem 1.25rem; transition: all 0.2s; }
        .btn-dark { background: #1a1208; color: #f5edd8; }
        .btn-dark:hover { background: #2d1f0a; }
        .btn-outline { background: transparent; border: 1px solid #d4c9b0; color: #5c4a1e; }
        .btn-outline:hover { border-color: #8b6914; }
        .input { width: 100%; padding: 0.7rem 1rem; border: 1px solid #d4c9b0; border-radius: 3px; font-family: 'Crimson Pro', Georgia, serif; font-size: 1rem; color: #1a1208; background: #fdfaf4; outline: none; transition: border-color 0.2s; }
        .input:focus { border-color: #8b6914; }
        .user-row { display: grid; grid-template-columns: 1fr 140px 120px 160px 80px; gap: 1rem; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid #f0e8d8; transition: background 0.15s; }
        .user-row:hover { background: #fdfaf4; }
        .delete-btn { background: none; border: 1px solid #e0c8c4; border-radius: 2px; padding: 0.2rem 0.5rem; cursor: pointer; color: #8b3a2a; font-size: 0.7rem; font-family: 'DM Mono', monospace; transition: all 0.2s; }
        .delete-btn:hover { background: #fdf3f0; border-color: #8b3a2a; }
        .delete-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>

      <header style={{ borderBottom: '1px solid #e8e0d0', background: '#fff', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <button onClick={() => router.push('/')} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>← Sessions</button>
          <span style={{ fontSize: '1.1rem', fontWeight: '500', color: '#1a1208' }}>User Management</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {currentUser && <span style={{ fontSize: '0.8rem', fontFamily: "'DM Mono', monospace", color: '#8b7355' }}>{currentUser.name}</span>}
          <button className="btn btn-outline" onClick={handleSignOut} style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>Sign Out</button>
          <button className="btn btn-dark" onClick={() => { setShowInvite(true); setError(''); }}>+ Invite User</button>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Total Users', value: users.length },
            { label: 'Staff', value: users.filter(u => u.role === 'staff' || u.role === 'super_admin').length },
            { label: 'Students', value: users.filter(u => u.role === 'student').length },
          ].map((s, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e8e0d0', borderRadius: '4px', padding: '1.25rem 1.5rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: '400', color: '#1a1208', fontFamily: "'DM Mono', monospace", marginBottom: '0.25rem' }}>{s.value}</div>
              <div style={{ fontSize: '0.72rem', fontFamily: "'DM Mono', monospace", color: '#8b7355', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Invite Modal */}
        {showInvite && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,18,8,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
            <div style={{ background: '#fdfaf4', border: '1px solid #d4c9b0', borderRadius: '6px', padding: '2.5rem', width: '100%', maxWidth: '460px' }}>
              <h2 style={{ fontSize: '1.6rem', fontWeight: '400', color: '#1a1208', marginBottom: '0.5rem' }}>Invite User</h2>
              <p style={{ color: '#8b7355', fontSize: '0.9rem', marginBottom: '2rem' }}>They'll receive an email to set their password.</p>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontFamily: "'DM Mono', monospace", color: '#5c4a1e', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Full Name</label>
                <input className="input" placeholder="e.g. Sarah Johnson" value={invite.name} onChange={e => setInvite(i => ({ ...i, name: e.target.value }))} autoFocus />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontFamily: "'DM Mono', monospace", color: '#5c4a1e', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Institutional Email</label>
                <input className="input" type="email" placeholder="name@university.edu" value={invite.email} onChange={e => setInvite(i => ({ ...i, email: e.target.value }))} />
              </div>
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontFamily: "'DM Mono', monospace", color: '#5c4a1e', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Role</label>
                <select className="input" value={invite.role} onChange={e => setInvite(i => ({ ...i, role: e.target.value }))}>
                  <option value="student">Student</option>
                  {currentUser?.role === 'super_admin' && <option value="staff">Staff</option>}
                  {currentUser?.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                  {currentUser?.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                </select>
              </div>

              {error && (
                <div style={{ background: 'rgba(139,58,42,0.1)', border: '1px solid rgba(139,58,42,0.3)', borderRadius: '3px', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
                  <p style={{ fontSize: '0.85rem', color: '#8b3a2a', fontFamily: "'DM Mono', monospace" }}>{error}</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-dark" onClick={inviteUser} disabled={inviting} style={{ flex: 1 }}>{inviting ? 'Sending...' : 'Send Invitation'}</button>
                <button className="btn btn-outline" onClick={() => { setShowInvite(false); setError(''); }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div style={{ background: 'rgba(45,106,79,0.1)', border: '1px solid rgba(45,106,79,0.3)', borderRadius: '4px', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: '#2d6a4f', fontFamily: "'DM Mono', monospace" }}>{success}</span>
            <button onClick={() => setSuccess('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2d6a4f', fontSize: '1.1rem' }}>×</button>
          </div>
        )}

        {/* Users Table */}
        <div style={{ background: '#fff', border: '1px solid #e8e0d0', borderRadius: '4px', overflow: 'hidden' }}>
          <div className="user-row" style={{ background: '#faf8f3', borderBottom: '2px solid #e8e0d0' }}>
            {['Name / Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
              <span key={h} style={{ fontSize: '0.68rem', fontFamily: "'DM Mono', monospace", color: '#8b7355', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</span>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#8b7355', fontStyle: 'italic' }}>Loading users...</div>
          ) : users.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#8b7355', fontStyle: 'italic' }}>No users yet. Invite someone to get started.</div>
          ) : (
            users.map(u => (
              <div key={u.id} className="user-row">
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: '500', color: '#1a1208', marginBottom: '0.1rem' }}>{u.name}</div>
                  <div style={{ fontSize: '0.78rem', fontFamily: "'DM Mono', monospace", color: '#8b7355' }}>{u.email}</div>
                </div>
                <span style={{ fontSize: '0.68rem', fontFamily: "'DM Mono', monospace", letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.2rem 0.5rem', borderRadius: '2px', background: roleColor(u.role) + '18', color: roleColor(u.role), border: '1px solid ' + roleColor(u.role) + '40', display: 'inline-block' }}>
                  {roleLabel(u.role)}
                </span>
                <span style={{ fontSize: '0.75rem', fontFamily: "'DM Mono', monospace", color: '#8b7355' }}>Active</span>
                <span style={{ fontSize: '0.75rem', fontFamily: "'DM Mono', monospace", color: '#8b7355' }}>
                  {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <div>
                  {u.id !== currentUser?.id && u.role !== 'super_admin' && (
                    <button
                      className="delete-btn"
                      onClick={() => deleteUser(u.id)}
                      disabled={deletingId === u.id}
                    >
                      {deletingId === u.id ? '...' : 'Remove'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
      <PoweredBy />
    </div>
  );
}
