'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function HomePage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', topic: '' });

  useEffect(() => {
    fetch(`${API}/api/sessions`)
      .then(r => r.json())
      .then(data => { setSessions(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function createSession() {
    if (!form.title || !form.topic) return;
    setCreating(true);
    const res = await fetch(`${API}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: form.title, topic: form.topic, createdBy: 'admin' }),
    });
    const session = await res.json();
    setSessions(prev => [session, ...prev]);
    setForm({ title: '', topic: '' });
    setCreating(false);
  }

  const statusColor = { pending: 'bg-yellow-100 text-yellow-800', active: 'bg-green-100 text-green-800', completed: 'bg-blue-100 text-blue-800' };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-brand to-slate-800">
      <header className="border-b border-white/10 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">LearnLive</h1>
          <p className="text-slate-400 text-sm mt-0.5">AI-Facilitated Discussion Platform</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="live-dot w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
          <span className="text-slate-400 text-sm">System Online</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-10">
        {/* Create Session */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-7 mb-8">
          <h2 className="font-display text-lg font-semibold text-white mb-5">Create New Session</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-slate-400 text-xs uppercase tracking-wider block mb-1.5">Session Title</label>
              <input
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Week 3 — Seminar Discussion"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs uppercase tracking-wider block mb-1.5">Discussion Topic</label>
              <input
                value={form.topic}
                onChange={e => setForm(p => ({ ...p, topic: e.target.value }))}
                placeholder="e.g. The ethics of AI in clinical decision-making"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-accent"
              />
            </div>
          </div>
          <button
            onClick={createSession}
            disabled={creating || !form.title || !form.topic}
            className="bg-accent hover:bg-orange-600 disabled:opacity-40 text-white px-6 py-3 rounded-xl text-sm font-medium transition-all"
          >
            {creating ? 'Creating...' : '+ Create Session'}
          </button>
        </div>

        {/* Sessions List */}
        <h2 className="font-display text-lg font-semibold text-white mb-4">All Sessions</h2>
        {loading ? (
          <div className="text-slate-400 text-sm">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="text-slate-400 text-sm">No sessions yet. Create your first one above.</div>
        ) : (
          <div className="space-y-3">
            {sessions.map(s => (
              <div key={s.id} className="bg-white/5 border border-white/10 rounded-xl p-5 flex items-center justify-between hover:bg-white/8 transition-all">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-white font-medium">{s.title}</h3>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${statusColor[s.status] || 'bg-slate-100 text-slate-700'}`}>
                      {s.status}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm">{s.topic}</p>
                  <p className="text-slate-600 text-xs mt-1">{new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="flex gap-2">
                  {s.status !== 'completed' && (
                    <Link href={`/admin/${s.id}`} className="bg-brand-light hover:bg-brand text-white text-sm px-4 py-2 rounded-lg transition-all">
                      {s.status === 'active' ? 'Live Dashboard' : 'Setup & Launch'}
                    </Link>
                  )}
                  {s.status === 'completed' && (
                    <Link href={`/report/${s.id}`} className="bg-emerald-700 hover:bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg transition-all">
                      View Report
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
