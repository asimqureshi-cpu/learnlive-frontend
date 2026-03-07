'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_BACKEND_URL;
const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

function MiniScore({ label, value }) {
  const color = value >= 7 ? '#2d6a4f' : value >= 4 ? '#8b6914' : '#8b3a2a';
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '1.3rem', fontFamily: "'DM Mono', monospace", fontWeight: '500', color, lineHeight: 1 }}>{value?.toFixed(1) || '—'}</div>
      <div style={{ fontSize: '0.6rem', fontFamily: "'DM Mono', monospace", color: '#a89878', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '3px' }}>{label}</div>
    </div>
  );
}

function BloomPip({ level }) {
  const map = { REMEMBER: 1, UNDERSTAND: 2, APPLY: 3, ANALYSE: 4, EVALUATE: 5, CREATE: 6 };
  const colors = { REMEMBER: '#a89878', UNDERSTAND: '#6b7c8b', APPLY: '#5c7a5e', ANALYSE: '#7a5c8b', EVALUATE: '#8b6914', CREATE: '#8b3a2a' };
  const n = map[level] || 0;
  return (
    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
      {[1,2,3,4,5,6].map(i => <div key={i} style={{ width: '6px', height: '6px', borderRadius: '1px', background: i <= n ? colors[level] : '#e8e0d0' }} />)}
      <span style={{ fontSize: '0.65rem', fontFamily: "'DM Mono', monospace", color: colors[level] || '#a89878', marginLeft: '4px' }}>{level || '—'}</span>
    </div>
  );
}

export default function AdminPage() {
  const { id } = useParams();
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [scores, setScores] = useState([]);
  const [transcripts, setTranscripts] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [status, setStatus] = useState('pending');
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [promptInput, setPromptInput] = useState('');
  const [promptTarget, setPromptTarget] = useState('group');
  const [utteranceCount, setUtteranceCount] = useState(0);
  const wsRef = useRef(null);
  const transcriptEndRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    fetchSession();
  }, []);

  useEffect(() => {
    if (status !== 'active') return;
    const ws = new WebSocket(WS_URL + '/ws?sessionId=' + id + '&role=admin');
    wsRef.current = ws;
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.event === 'NEW_UTTERANCE') {
        setTranscripts(prev => [...prev, msg.data]);
        setUtteranceCount(c => c + 1);
        setTimeout(() => transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
      if (msg.event === 'SCORE_UPDATE') {
        setScores(prev => {
          const idx = prev.findIndex(s => s.speaker_tag === msg.data.speakerTag);
          const updated = { speaker_tag: msg.data.speakerTag, ...msg.data.scores, participation_stats: msg.data.participationStats };
          if (idx >= 0) { const n = [...prev]; n[idx] = updated; return n; }
          return [...prev, updated];
        });
      }
      if (msg.event === 'PROMPT_SUGGESTION') {
        setPrompts(prev => [{ ...msg.data, id: Date.now(), type: 'suggestion' }, ...prev].slice(0, 10));
      }
      if (msg.event === 'PROMPT_ISSUED') {
        setPrompts(prev => [{ ...msg.data, id: Date.now(), type: 'issued' }, ...prev].slice(0, 10));
      }
    };
    return () => ws.close();
  }, [status, id]);

  async function fetchSession() {
    try {
      const res = await fetch(API + '/api/sessions/' + id);
      const data = await res.json();
      setSession(data);
      setStatus(data.status);
      setMaterials(data.materials || []);
      if (data.status === 'completed') router.push('/report/' + id);
    } catch (err) { console.error(err); }
  }

  async function startSession() {
    setStarting(true);
    await fetch(API + '/api/sessions/' + id + '/start', { method: 'POST' });
    setStatus('active');
    setStarting(false);
  }

  async function endSession() {
    if (!confirm('End this session and generate the report?')) return;
    setEnding(true);
    const res = await fetch(API + '/api/sessions/' + id + '/end', { method: 'POST' });
    setEnding(false);
    router.push('/report/' + id);
  }

  async function uploadPDF(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('pdf', file);
    try {
      await fetch(API + '/api/materials/' + id + '/upload', { method: 'POST', body: formData });
      await fetchSession();
    } catch (err) { alert('Upload failed'); }
    setUploading(false);
  }

  async function issuePrompt() {
    if (!promptInput.trim()) return;
    await fetch(API + '/api/sessions/' + id + '/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: promptTarget, prompt: promptInput, type: 'manual' }),
    });
    setPromptInput('');
  }

  const sessionUrl = typeof window !== 'undefined' ? window.location.origin + '/session/' + id : '';

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f3', fontFamily: "'Crimson Pro', Georgia, serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .panel { background: #fff; border: 1px solid #e8e0d0; border-radius: 4px; padding: 1.5rem; margin-bottom: 1rem; }
        .label { font-size: 0.68rem; font-family: 'DM Mono', monospace; color: #8b7355; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 0.75rem; }
        .btn { border: none; border-radius: 3px; cursor: pointer; font-family: 'Crimson Pro', Georgia, serif; font-size: 0.95rem; padding: 0.6rem 1.25rem; transition: all 0.2s; }
        .btn-dark { background: #1a1208; color: #f5edd8; }
        .btn-dark:hover { background: #2d1f0a; }
        .btn-green { background: #2d6a4f; color: #fff; }
        .btn-green:hover { background: #245a41; }
        .btn-red { background: #8b3a2a; color: #fff; }
        .btn-red:hover { background: #7a3224; }
        .btn-outline { background: transparent; border: 1px solid #d4c9b0; color: #5c4a1e; }
        .btn-outline:hover { border-color: #8b6914; }
        .input { width: 100%; padding: 0.6rem 0.875rem; border: 1px solid #d4c9b0; border-radius: 3px; font-family: 'Crimson Pro', Georgia, serif; font-size: 1rem; color: #1a1208; background: #fdfaf4; outline: none; }
        .input:focus { border-color: #8b6914; }
        .live-dot { width: 8px; height: 8px; border-radius: 50%; background: #2d6a4f; animation: livepulse 1.5s ease-in-out infinite; display: inline-block; }
        @keyframes livepulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(0.8); } }
        .utterance { padding: 0.6rem 0; border-bottom: 1px solid #f0e8d8; display: flex; gap: 0.875rem; align-items: flex-start; animation: fadeup 0.3s ease; }
        @keyframes fadeup { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
        .copy-btn { background: none; border: 1px solid #d4c9b0; border-radius: 2px; padding: 0.2rem 0.5rem; font-size: 0.7rem; font-family: 'DM Mono', monospace; color: #8b7355; cursor: pointer; }
        .copy-btn:hover { border-color: #8b6914; color: #1a1208; }
      `}</style>

      {/* Header */}
      <header style={{ borderBottom: '1px solid #e8e0d0', background: '#fff', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <button onClick={() => router.push('/')} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>← Sessions</button>
          <div>
            <span style={{ fontSize: '1rem', fontWeight: '500', color: '#1a1208' }}>{session?.title || 'Loading...'}</span>
            {status === 'active' && <span style={{ marginLeft: '0.75rem' }}><span className="live-dot" /><span style={{ fontSize: '0.7rem', fontFamily: "'DM Mono', monospace", color: '#2d6a4f', marginLeft: '5px', letterSpacing: '0.08em' }}>LIVE</span></span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {status === 'pending' && <button className="btn btn-green" onClick={startSession} disabled={starting}>{starting ? 'Starting...' : '▶ Start Session'}</button>}
          {status === 'active' && <button className="btn btn-red" onClick={endSession} disabled={ending}>{ending ? 'Generating...' : '■ End & Generate Report'}</button>}
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.25rem', maxWidth: '1300px', margin: '0 auto', padding: '1.5rem 1.5rem' }}>

        {/* LEFT COLUMN */}
        <div>
          {/* Session info + link */}
          <div className="panel">
            <p className="label">Session Details</p>
            <p style={{ fontSize: '1.05rem', color: '#2a1f0e', marginBottom: '0.25rem', fontStyle: 'italic' }}>{session?.topic}</p>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', fontFamily: "'DM Mono', monospace", color: '#8b7355', background: '#faf8f3', border: '1px solid #e8e0d0', borderRadius: '3px', padding: '0.35rem 0.75rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sessionUrl}</span>
              <button className="copy-btn" onClick={() => navigator.clipboard.writeText(sessionUrl)}>Copy Link</button>
            </div>
          </div>

          {/* Materials */}
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <p className="label" style={{ marginBottom: 0 }}>Materials</p>
              <div>
                <input type="file" accept=".pdf" ref={fileRef} onChange={uploadPDF} style={{ display: 'none' }} />
                <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.35rem 0.875rem' }} onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? 'Uploading...' : '+ Upload PDF'}
                </button>
              </div>
            </div>
            {materials.length === 0 ? (
              <p style={{ fontSize: '0.9rem', color: '#a89878', fontStyle: 'italic' }}>No materials uploaded yet</p>
            ) : (
              materials.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderTop: i > 0 ? '1px solid #f0e8d8' : 'none' }}>
                  <span style={{ fontSize: '0.85rem', color: '#5c4a1e' }}>📄</span>
                  <span style={{ fontSize: '0.9rem', color: '#2a1f0e' }}>{m.file_name}</span>
                </div>
              ))
            )}
          </div>

          {/* Live Transcript */}
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <p className="label" style={{ marginBottom: 0 }}>Live Transcript</p>
              <span style={{ fontSize: '0.75rem', fontFamily: "'DM Mono', monospace", color: '#8b7355' }}>{utteranceCount} utterances</span>
            </div>
            <div style={{ height: '320px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {transcripts.length === 0 ? (
                <p style={{ fontSize: '0.9rem', color: '#a89878', fontStyle: 'italic', textAlign: 'center', paddingTop: '4rem' }}>
                  {status === 'active' ? 'Waiting for speech...' : 'Start the session to see transcript'}
                </p>
              ) : (
                transcripts.map((t, i) => (
                  <div key={i} className="utterance">
                    <span style={{ fontSize: '0.72rem', fontFamily: "'DM Mono', monospace", color: '#8b6914', flexShrink: 0, paddingTop: '3px', minWidth: '65px' }}>{t.speakerTag}</span>
                    <span style={{ fontSize: '0.93rem', color: '#2a1f0e', lineHeight: 1.5 }}>{t.utterance}</span>
                  </div>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>
          </div>

          {/* Issue Prompt */}
          {status === 'active' && (
            <div className="panel">
              <p className="label">Issue Facilitation Prompt</p>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <select value={promptTarget} onChange={e => setPromptTarget(e.target.value)} style={{ padding: '0.6rem 0.875rem', border: '1px solid #d4c9b0', borderRadius: '3px', fontFamily: "'Crimson Pro', Georgia, serif", fontSize: '0.95rem', color: '#1a1208', background: '#fdfaf4', outline: 'none' }}>
                  <option value="group">Group</option>
                  {scores.map(s => <option key={s.speaker_tag} value={s.speaker_tag}>{s.speaker_tag}</option>)}
                </select>
                <input className="input" placeholder="Enter a facilitation prompt..." value={promptInput} onChange={e => setPromptInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && issuePrompt()} />
                <button className="btn btn-dark" onClick={issuePrompt} style={{ flexShrink: 0 }}>Issue</button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div>
          {/* Live Scores */}
          <div className="panel">
            <p className="label">Participant Scores</p>
            {scores.length === 0 ? (
              <p style={{ fontSize: '0.9rem', color: '#a89878', fontStyle: 'italic' }}>{status === 'active' ? 'Scores appear as participants speak...' : 'No scores yet'}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {scores.map((s, i) => (
                  <div key={i} style={{ paddingBottom: '1.25rem', borderBottom: i < scores.length - 1 ? '1px solid #f0e8d8' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '1rem', fontWeight: '500', color: '#1a1208' }}>{s.speaker_tag}</span>
                      <span style={{ fontSize: '1.4rem', fontFamily: "'DM Mono', monospace", fontWeight: '500', color: s.overall_score >= 7 ? '#2d6a4f' : s.overall_score >= 4 ? '#8b6914' : '#8b3a2a' }}>
                        {s.overall_score?.toFixed(1) || '—'}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <MiniScore label="Topic" value={s.topic_adherence} />
                      <MiniScore label="Depth" value={s.depth} />
                      <MiniScore label="Material" value={s.material_application} />
                    </div>
                    {s.bloom_level && <BloomPip level={s.bloom_level} />}
                    {s.participation_stats && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', fontFamily: "'DM Mono', monospace", color: '#a89878' }}>
                        {s.participation_stats.utteranceCount} utterances · {Math.round(s.participation_stats.talkTimeSeconds)}s talk time
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Suggestions */}
          {prompts.length > 0 && (
            <div className="panel">
              <p className="label">AI Suggestions</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {prompts.slice(0, 5).map(p => (
                  <div key={p.id} style={{ background: p.type === 'issued' ? '#f0f7f3' : '#fdfaf4', border: '1px solid ' + (p.type === 'issued' ? '#c8e0d4' : '#e8d9b8'), borderRadius: '3px', padding: '0.875rem 1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.65rem', fontFamily: "'DM Mono', monospace", color: p.type === 'issued' ? '#2d6a4f' : '#8b6914', letterSpacing: '0.08em' }}>
                        {p.type === 'issued' ? 'ISSUED' : 'SUGGESTED'} → {p.target}
                      </span>
                      {p.flag && <span style={{ fontSize: '0.6rem', fontFamily: "'DM Mono', monospace", color: '#8b7355' }}>{p.flag}</span>}
                    </div>
                    <p style={{ fontSize: '0.875rem', color: '#2a1f0e', lineHeight: 1.5, marginBottom: p.type === 'suggestion' ? '0.5rem' : 0 }}>{p.prompt}</p>
                    {p.type === 'suggestion' && (
                      <button className="btn btn-dark" style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                        onClick={() => { setPromptInput(p.prompt); setPromptTarget(p.target); }}>
                        Use this prompt
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
