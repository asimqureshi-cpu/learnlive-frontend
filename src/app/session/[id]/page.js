'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useRoomContext,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const API = process.env.NEXT_PUBLIC_BACKEND_URL;
const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

function computeRMS(int16Array) {
  let sum = 0;
  for (let i = 0; i < int16Array.length; i++) {
    const s = int16Array[i] / 32768;
    sum += s * s;
  }
  return Math.sqrt(sum / int16Array.length);
}

function PoweredBy() {
  return (
    <div style={{ position: 'fixed', bottom: '1rem', right: '1.25rem', zIndex: 50, opacity: 0.45, transition: 'opacity 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
      onMouseLeave={e => e.currentTarget.style.opacity = '0.45'}>
      <a href="https://thebrainsyndicate.com" target="_blank" rel="noopener noreferrer"
        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
        <span style={{ fontSize: '0.6rem', fontFamily: "'DM Mono', monospace", color: '#c9b890', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Powered by</span>
        <span style={{ fontSize: '0.7rem', fontFamily: "'DM Mono', monospace", color: '#c9b890', fontWeight: '500', letterSpacing: '0.06em' }}>The Brain Syndicate</span>
      </a>
    </div>
  );
}

function NudgeOverlay({ prompts }) {
  const [visible, setVisible] = useState([]);
  useEffect(() => {
    if (!prompts.length) return;
    const latest = prompts[0];
    setVisible(prev => [{ ...latest, key: Date.now() }, ...prev].slice(0, 3));
    const t = setTimeout(() => setVisible(prev => prev.slice(0, -1)), 8000);
    return () => clearTimeout(t);
  }, [prompts.length]);
  if (!visible.length) return null;
  return (
    <div style={{ position: 'fixed', right: '1.5rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '0.75rem', zIndex: 200, maxWidth: '280px' }}>
      {visible.map(p => (
        <div key={p.key} style={{ background: p.target === 'group' ? 'rgba(26,18,8,0.92)' : 'rgba(15,30,50,0.92)', border: '1px solid ' + (p.target === 'group' ? 'rgba(201,184,144,0.3)' : 'rgba(100,160,220,0.3)'), borderRadius: '6px', padding: '1rem 1.25rem', backdropFilter: 'blur(8px)', animation: 'slideIn 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.target === 'group' ? '#c9b890' : '#64a0dc', flexShrink: 0 }} />
            <span style={{ fontSize: '0.6rem', fontFamily: "'DM Mono', monospace", color: p.target === 'group' ? '#c9b890' : '#64a0dc', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{p.target === 'group' ? 'Group' : 'You'}</span>
          </div>
          <p style={{ fontSize: '0.9rem', color: '#f5edd8', lineHeight: 1.5, fontFamily: "'Crimson Pro', Georgia, serif" }}>{p.prompt}</p>
        </div>
      ))}
    </div>
  );
}

function AudioProcessor({ participantName, sessionId, wsRef }) {
  const room = useRoomContext();
  const audioCtxRef = useRef(null);
  const processorRef = useRef(null);
  const streamRef = useRef(null);
  const [speaking, setSpeaking] = useState(false);
  const manualOverrideRef = useRef(false);

  useEffect(() => {
    let active = true;
    async function start() {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 16000 }
      });
      if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;
      const ctx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        const float32 = e.inputBuffer.getChannelData(0);
        const int16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768));
        const rms = computeRMS(int16);
        wsRef.current.send(JSON.stringify({ type: 'rms', rms, participantName, manualOverride: manualOverrideRef.current }));
        wsRef.current.send(int16.buffer);
      };
      source.connect(processor);
      processor.connect(ctx.destination);
    }
    start().catch(console.error);
    return () => {
      active = false;
      processorRef.current?.disconnect();
      audioCtxRef.current?.close();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <div style={{ position: 'fixed', bottom: '5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}>
      <button
        onMouseDown={() => { manualOverrideRef.current = true; setSpeaking(true); }}
        onMouseUp={() => { manualOverrideRef.current = false; setSpeaking(false); }}
        onTouchStart={() => { manualOverrideRef.current = true; setSpeaking(true); }}
        onTouchEnd={() => { manualOverrideRef.current = false; setSpeaking(false); }}
        style={{ background: speaking ? 'rgba(201,184,144,0.2)' : 'rgba(26,18,8,0.7)', border: '1px solid ' + (speaking ? '#c9b890' : 'rgba(201,184,144,0.3)'), borderRadius: '24px', padding: '0.6rem 1.5rem', color: speaking ? '#c9b890' : 'rgba(201,184,144,0.5)', fontSize: '0.75rem', fontFamily: "'DM Mono', monospace", letterSpacing: '0.08em', cursor: 'pointer', backdropFilter: 'blur(8px)', transition: 'all 0.15s' }}>
        {speaking ? '● Speaking' : '○ Hold to speak'}
      </button>
    </div>
  );
}

export default function SessionPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [joined, setJoined] = useState(false);
  const [prompts, setPrompts] = useState([]);
  const [authChecked, setAuthChecked] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // Save intended destination and redirect to login
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('redirectAfterLogin', '/session/' + id);
        }
        router.push('/login?redirect=/session/' + id);
        return;
      }
      setAuthUser(session.user);
      setAuthChecked(true);
      // Pre-fill name from user metadata if available
      const name = session.user.user_metadata?.name || session.user.email?.split('@')[0] || '';
      setNameInput(name);
      // Fetch session info for group name
      fetch(`${API}/api/sessions/${id}`)
        .then(r => r.json())
        .then(data => setSessionInfo(data))
        .catch(() => {});
    });
  }, []);

  async function joinSession() {
    const name = nameInput.trim();
    if (!name) return;
    try {
      const res = await fetch(`${API}/api/livekit/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName: id, participantName: name, isAdmin: false }),
      });
      const data = await res.json();
      setToken(data.token);
      setParticipantName(name);
      // Connect WebSocket
      const ws = new WebSocket(`${WS_URL}/ws?sessionId=${id}&participantName=${encodeURIComponent(name)}`);
      wsRef.current = ws;
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.event === 'PROMPT_ISSUED' && (msg.data.target === 'group' || msg.data.target === name)) {
          setPrompts(prev => [msg.data, ...prev]);
        }
      };
      setJoined(true);
    } catch (err) {
      console.error('[Join error]', err);
      alert('Failed to join session: ' + (err?.message || String(err)));
    }
  }

  if (!authChecked) return null;

  if (!joined) {
    return (
      <div style={{ minHeight: '100vh', background: '#0e0b06', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Crimson Pro', Georgia, serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Mono:wght@400;500&display=swap'); * { box-sizing: border-box; }`}</style>
        <div style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: '600', color: '#c9b890', letterSpacing: '-0.01em' }}>LearnLive</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '300', color: '#f5edd8', marginBottom: '0.5rem' }}>{sessionInfo?.title || 'Join Session'}</h1>
          {sessionInfo?.topic && <p style={{ fontSize: '0.95rem', color: 'rgba(245,237,216,0.5)', marginBottom: '0.75rem', fontStyle: 'italic' }}>{sessionInfo.topic}</p>}
          {sessionInfo?.group_name ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(201,184,144,0.12)', border: '1px solid rgba(201,184,144,0.3)', borderRadius: '4px', padding: '0.4rem 0.875rem', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.6rem', fontFamily: "'DM Mono', monospace", color: 'rgba(201,184,144,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Group</span>
              <span style={{ fontSize: '0.9rem', color: '#c9b890', fontWeight: '500' }}>{sessionInfo.group_name}</span>
            </div>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'rgba(245,237,216,0.4)', marginBottom: '2rem', fontFamily: "'DM Mono', monospace" }}>Confirm your display name</p>
          )}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.68rem', fontFamily: "'DM Mono', monospace", color: 'rgba(201,184,144,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Your Name</label>
            <input
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && joinSession()}
              autoFocus
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,184,144,0.2)', borderRadius: '4px', padding: '14px 16px', color: '#f5edd8', fontFamily: "'Crimson Pro', Georgia, serif", fontSize: '1.05rem', outline: 'none' }}
            />
          </div>
          <button onClick={joinSession} style={{ width: '100%', background: '#c9b890', color: '#0e0b06', border: 'none', padding: '14px', borderRadius: '4px', fontFamily: "'Crimson Pro', Georgia, serif", fontSize: '1.05rem', fontWeight: '600', cursor: 'pointer' }}>
            Join Now
          </button>
        </div>
        <PoweredBy />
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', background: '#0e0b06', position: 'relative' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        .lk-room-container { background: #0e0b06 !important; }
        .lk-participant-tile { border: 1px solid rgba(201,184,144,0.15) !important; border-radius: 8px !important; }
        .lk-participant-name { color: #c9b890 !important; font-family: 'DM Mono', monospace !important; font-size: 0.75rem !important; }
        .lk-control-bar { background: rgba(26,18,8,0.9) !important; border-top: 1px solid rgba(201,184,144,0.1) !important; backdrop-filter: blur(8px) !important; }
        .lk-button { color: #c9b890 !important; }
        .lk-button:hover { background: rgba(201,184,144,0.1) !important; }
      `}</style>
      <LiveKitRoom
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        connect={true}
        video={true}
        audio={false}
        style={{ height: '100%' }}
      >
        <VideoConference />
        <RoomAudioRenderer />
        <AudioProcessor participantName={participantName} sessionId={id} wsRef={wsRef} />
      </LiveKitRoom>
      <NudgeOverlay prompts={prompts} />
      <PoweredBy />
    </div>
  );
}
