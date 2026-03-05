'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_BACKEND_URL;
const WS = process.env.NEXT_PUBLIC_WS_URL;

function ScoreBar({ value = 0, color = 'bg-brand-light', label }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-500">{label}</span>
        <span className="text-slate-300 font-medium">{value?.toFixed(1) ?? '—'}/10</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${(value ?? 0) * 10}%` }} />
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [scores, setScores] = useState({});
  const [transcripts, setTranscripts] = useState([]);
  const [prompts, setPrompts] = useState([]); // suggested prompts from AI
  const [sessionActive, setSessionActive] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [customPrompt, setCustomPrompt] = useState({ target: 'group', text: '' });
  const transcriptRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/api/sessions/${id}`)
      .then(r => r.json())
      .then(data => {
        setSession(data);
        setMaterials(data.materials || []);
        setSessionActive(data.status === 'active');
        // Build scores map
        const scoresMap = {};
        (data.scores || []).forEach(s => { scoresMap[s.speaker_tag] = s; });
        setScores(scoresMap);
      });
  }, [id]);

  // WebSocket for live updates
  useEffect(() => {
    const ws = new WebSocket(`${WS}/ws?sessionId=${id}&role=admin`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const { event, data } = JSON.parse(e.data);

      if (event === 'NEW_UTTERANCE') {
        setTranscripts(prev => [...prev.slice(-99), data]);
        setTimeout(() => {
          transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
        }, 50);
      }

      if (event === 'SCORE_UPDATE') {
        setScores(prev => ({
          ...prev,
          [data.speakerTag]: {
            ...prev[data.speakerTag],
            speaker_tag: data.speakerTag,
            topic_adherence_score: data.scores.topic_adherence,
            depth_score: data.scores.depth,
            material_application_score: data.scores.material_application,
            participation_score: data.participationStats?.talkTimeSeconds
              ? Math.min(10, data.participationStats.talkTimeSeconds / 30)
              : prev[data.speakerTag]?.participation_score,
          }
        }));
      }

      if (event === 'PROMPT_SUGGESTION' || event === 'GROUP_INTERVENTION') {
        setPrompts(prev => [{ ...data, id: Date.now(), event }, ...prev.slice(0, 9)]);
      }
    };

    ws.onerror = console.error;
    return () => ws.close();
  }, [id]);

  async function startSession() {
    await fetch(`${API}/api/sessions/${id}/start`, { method: 'POST' });
    setSessionActive(true);
  }

  async function endSession() {
    if (!confirm('End this session and generate the report?')) return;
    await fetch(`${API}/api/sessions/${id}/end`, { method: 'POST' });
    window.location.href = `/report/${id}`;
  }

  async function uploadMaterial(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFile(true);
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API}/api/materials/${id}/upload`, { method: 'POST', body: form });
    const data = await res.json();
    if (data.material) setMaterials(prev => [...prev, data.material]);
    setUploadingFile(false);
  }

  async function issuePrompt(promptText, target = 'group', type = 'CUSTOM') {
    await fetch(`${API}/api/sessions/${id}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, prompt: promptText, type }),
    });
    setPrompts(prev => prev.filter(p => p.prompt !== promptText));
    setCustomPrompt({ target: 'group', text: '' });
  }

  const sessionLink = typeof window !== 'undefined'
    ? `${window.location.origin}/session/${id}`
    : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-brand/30">
      {/* Header */}
      <header className="border-b border-white/10 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-slate-500 hover:text-white text-sm transition-colors">← Sessions</Link>
          <div>
            <h1 className="font-display text-xl font-semibold text-white">{session?.title}</h1>
            <p className="text-slate-400 text-xs">{session?.topic}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {sessionActive && (
            <span className="flex items-center gap-1.5 text-emerald-400 text-sm">
              <span className="live-dot w-2 h-2 rounded-full bg-emerald-400"></span> LIVE
            </span>
          )}
          {!sessionActive ? (
            <button onClick={startSession} disabled={materials.length === 0}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-5 py-2 rounded-lg text-sm font-medium transition-all">
              {materials.length === 0 ? 'Upload materials first' : '▶ Start Session'}
            </button>
          ) : (
            <button onClick={endSession}
              className="bg-red-700 hover:bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition-all">
              ■ End & Generate Report
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-12 gap-0 h-[calc(100vh-65px)]">

        {/* LEFT — Participant scores */}
        <div className="col-span-3 border-r border-white/10 p-5 overflow-y-auto">
          <h2 className="text-slate-400 text-xs uppercase tracking-wider mb-4">Participants</h2>

          {Object.keys(scores).length === 0 ? (
            <p className="text-slate-600 text-sm">No participants yet. Scores appear when the session is live.</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(scores).map(([name, s]) => (
                <div key={name} className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white text-sm font-medium">{name}</span>
                    <span className="text-2xl font-display font-bold text-accent">
                      {s.overall_score ? s.overall_score.toFixed(1) : '—'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <ScoreBar label="Participation" value={s.participation_score} color="bg-blue-500" />
                    <ScoreBar label="Topic Adherence" value={s.topic_adherence_score} color="bg-violet-500" />
                    <ScoreBar label="Depth" value={s.depth_score} color="bg-amber-500" />
                    <ScoreBar label="Material Application" value={s.material_application_score} color="bg-emerald-500" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CENTRE — Live transcript */}
        <div className="col-span-5 flex flex-col border-r border-white/10">
          <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-slate-400 text-xs uppercase tracking-wider">Live Transcript</h2>
            <span className="text-slate-600 text-xs">{transcripts.length} utterances</span>
          </div>
          <div ref={transcriptRef} className="flex-1 overflow-y-auto p-5 space-y-3">
            {transcripts.length === 0 && (
              <p className="text-slate-600 text-sm">Transcript will appear here when the session is live.</p>
            )}
            {transcripts.map((t, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-20 shrink-0">
                  <span className="text-slate-500 text-xs font-medium">{t.speakerTag}</span>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">{t.utterance}</p>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — AI prompts + controls */}
        <div className="col-span-4 flex flex-col overflow-y-auto">

          {/* Session link + materials */}
          <div className="p-5 border-b border-white/10">
            <h2 className="text-slate-400 text-xs uppercase tracking-wider mb-3">Session Link</h2>
            <div className="bg-white/5 rounded-lg px-3 py-2 flex items-center justify-between gap-2 mb-4">
              <span className="text-slate-400 text-xs truncate">{sessionLink}</span>
              <button onClick={() => navigator.clipboard.writeText(sessionLink)}
                className="text-accent text-xs shrink-0 hover:text-orange-400">Copy</button>
            </div>

            <h2 className="text-slate-400 text-xs uppercase tracking-wider mb-2">Materials</h2>
            <div className="space-y-1.5 mb-3">
              {materials.map(m => (
                <div key={m.id} className="flex items-center gap-2 text-slate-400 text-xs">
                  <span>📄</span> {m.file_name}
                </div>
              ))}
              {materials.length === 0 && <p className="text-slate-600 text-xs">No materials uploaded</p>}
            </div>
            <label className="cursor-pointer bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs px-3 py-2 rounded-lg inline-block transition-all">
              {uploadingFile ? 'Processing...' : '+ Upload PDF'}
              <input type="file" accept="application/pdf" onChange={uploadMaterial} className="hidden" disabled={uploadingFile} />
            </label>
          </div>

          {/* AI Prompt suggestions */}
          <div className="p-5 border-b border-white/10 flex-1">
            <h2 className="text-slate-400 text-xs uppercase tracking-wider mb-3">
              AI Prompt Queue {prompts.length > 0 && <span className="ml-2 bg-accent text-white text-xs rounded-full px-1.5">{prompts.length}</span>}
            </h2>
            <div className="space-y-3">
              {prompts.length === 0 && (
                <p className="text-slate-600 text-xs">AI suggestions appear here during the session.</p>
              )}
              {prompts.map(p => (
                <div key={p.id} className="prompt-toast bg-white/5 border border-white/15 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-300 font-medium">
                      {p.flag || p.type || 'SUGGESTION'}
                    </span>
                    <span className="text-slate-500 text-xs">→ {p.target}</span>
                  </div>
                  <p className="text-slate-300 text-xs mb-2 leading-relaxed">"{p.prompt}"</p>
                  {p.reasoning && <p className="text-slate-600 text-xs italic mb-3">{p.reasoning}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => issuePrompt(p.prompt, p.target, p.flag)}
                      className="bg-accent hover:bg-orange-600 text-white text-xs px-3 py-1.5 rounded-lg transition-all">
                      Issue Prompt
                    </button>
                    <button onClick={() => setPrompts(prev => prev.filter(x => x.id !== p.id))}
                      className="text-slate-500 hover:text-slate-300 text-xs px-2 py-1.5 rounded-lg transition-all">
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Manual prompt */}
          <div className="p-5">
            <h2 className="text-slate-400 text-xs uppercase tracking-wider mb-3">Issue Custom Prompt</h2>
            <select value={customPrompt.target} onChange={e => setCustomPrompt(p => ({ ...p, target: e.target.value }))}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-xs mb-2 focus:outline-none">
              <option value="group">→ Whole group</option>
              {Object.keys(scores).map(name => <option key={name} value={name}>→ {name}</option>)}
            </select>
            <textarea value={customPrompt.text} onChange={e => setCustomPrompt(p => ({ ...p, text: e.target.value }))}
              placeholder="Type a prompt to display on participants' screens..."
              rows={2}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-xs placeholder-slate-600 focus:outline-none resize-none mb-2" />
            <button onClick={() => customPrompt.text && issuePrompt(customPrompt.text, customPrompt.target, 'MANUAL')}
              disabled={!customPrompt.text}
              className="bg-brand-light hover:bg-brand disabled:opacity-40 text-white text-xs px-4 py-2 rounded-lg transition-all">
              Send Prompt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
