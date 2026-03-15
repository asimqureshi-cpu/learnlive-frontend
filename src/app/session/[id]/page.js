'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  LiveKitRoom, VideoConference, RoomAudioRenderer, useRoomContext,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const API = process.env.NEXT_PUBLIC_BACKEND_URL;
const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

const WORKLET_CODE = `
class PCMProcessor extends AudioWorkletProcessor {
  constructor() { super(); this._buf = []; }
  process(inputs) {
    const ch = inputs[0]?.[0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) this._buf.push(ch[i]);
    while (this._buf.length >= 4096) {
      const chunk = this._buf.splice(0, 4096);
      const int16 = new Int16Array(4096);
      let sum = 0;
      for (let i = 0; i < 4096; i++) {
        const s = Math.max(-1, Math.min(1, chunk[i]));
        int16[i] = s * 32767;
        sum += s * s;
      }
      this.port.postMessage({ int16: int16.buffer, rms: Math.sqrt(sum / 4096) }, [int16.buffer]);
    }
    return true;
  }
}
registerProcessor('pcm-processor', PCMProcessor);
`;

function AudioStreamer({ sessionId, participantName, isSpeaking, mediaStream }) {
  const room = useRoomContext();
  const audioWsRef = useRef(null);
  const cleanupRef = useRef(null);
  const startedRef = useRef(false);
  const isSpeakingRef = useRef(isSpeaking);

  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);

  useEffect(() => {
    if (!room || !mediaStream || !participantName) return;

    async function startPipeline() {
      if (startedRef.current) return;
      startedRef.current = true;

      const wsUrl = `${WS_URL}/ws?sessionId=${sessionId}&type=audio&participant=${encodeURIComponent(participantName)}`;
      const audioWs = new WebSocket(wsUrl);
      audioWsRef.current = audioWs;

      audioWs.onerror = (e) => console.error('[Audio] WS error', e);
      audioWs.onclose = (e) => console.log('[Audio] WS closed', e.code);

      audioWs.onopen = async () => {
        try {
          const audioContext = new AudioContext({ sampleRate: 16000 });
          const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
          const workletUrl = URL.createObjectURL(blob);
          await audioContext.audioWorklet.addModule(workletUrl);
          URL.revokeObjectURL(workletUrl);
          const source = audioContext.createMediaStreamSource(mediaStream);
          const workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');
          workletNode.port.onmessage = ({ data: { int16, rms } }) => {
            if (audioWs.readyState !== WebSocket.OPEN) return;
            audioWs.send(JSON.stringify({ type: 'rms', rms, manualOverride: isSpeakingRef.current }));
            audioWs.send(int16);
          };
          source.connect(workletNode);
          cleanupRef.current = () => {
            try { workletNode.disconnect(); source.disconnect(); audioContext.close(); } catch (_) {}
          };
        } catch (workletErr) {
          try {
            const audioContext = new AudioContext({ sampleRate: 16000 });
            const source = audioContext.createMediaStreamSource(mediaStream);
            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            source.connect(processor);
            processor.connect(audioContext.destination);
            processor.onaudioprocess = (ev) => {
              if (audioWs.readyState !== WebSocket.OPEN) return;
              const f32 = ev.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(f32.length);
              let sum = 0;
              for (let i = 0; i < f32.length; i++) {
                const s = Math.max(-1, Math.min(1, f32[i]));
                int16[i] = s * 32767;
                sum += s * s;
              }
              audioWs.send(JSON.stringify({ type: 'rms', rms: Math.sqrt(sum / f32.length), manualOverride: isSpeakingRef.current }));
              audioWs.send(int16.buffer);
            };
            cleanupRef.current = () => {
              try { processor.disconnect(); source.disconnect(); audioContext.close(); } catch (_) {}
            };
          } catch (spErr) {
            console.error('[Audio] Both audio methods failed:', spErr.message);
          }
        }
      };
    }

    if (room.state === 'connected') startPipeline();
    else room.on('connected', startPipeline);

    return () => {
      room.off('connected', startPipeline);
      if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null; }
      if (audioWsRef.current) { audioWsRef.current.close(); audioWsRef.current = null; }
      startedRef.current = false;
    };
  }, [room, mediaStream, sessionId, participantName]);

  return null;
}

// ─── Opening question banner ──────────────────────────────────────────────────
// Full-width, prominent, stays for 60 seconds then fades
function OpeningQuestionBanner({ question, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Animate in
    const t1 = setTimeout(() => setVisible(true), 100);
    // Start fade at 55s
    const t2 = setTimeout(() => setFading(true), 55000);
    // Dismiss at 60s
    const t3 = setTimeout(() => onDismiss(), 60000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div style={{
      position: 'absolute', top: '72px', left: '50%',
      transform: `translateX(-50%) translateY(${visible ? '0' : '-12px'})`,
      opacity: fading ? 0 : (visible ? 1 : 0),
      transition: fading ? 'opacity 5s ease' : 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      zIndex: 150, width: 'min(600px, calc(100vw - 2.5rem))',
      background: 'rgba(10, 8, 4, 0.92)',
      border: '1px solid rgba(201,184,144,0.45)',
      borderTop: '2px solid rgba(201,184,144,0.7)',
      borderRadius: '10px',
      padding: '1.25rem 1.5rem',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.875rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#c9b890', display: 'inline-block', boxShadow: '0 0 8px rgba(201,184,144,0.6)' }} />
            <span style={{ fontSize: '0.6rem', fontFamily: "'DM Mono', monospace", letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(201,184,144,0.7)' }}>
              Opening question
            </span>
          </div>
          <p style={{ color: '#f5edd8', fontSize: '1.05rem', lineHeight: 1.6, fontFamily: "'Crimson Pro', Georgia, serif", fontWeight: '300' }}>
            {question}
          </p>
        </div>
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', fontSize: '1.3rem', lineHeight: 1, padding: 0, flexShrink: 0, marginTop: '2px' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}>×</button>
      </div>
    </div>
  );
}

// ─── Nudge card ───────────────────────────────────────────────────────────────
// Personal (targeted) vs General (group/scheduled) have distinct visuals
function NudgeCard({ nudge, onDismiss }) {
  const isPersonal = nudge.type !== 'GENERAL_PROMPT' && nudge.target !== 'group';
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 50); return () => clearTimeout(t); }, []);

  return (
    <div style={{
      background: isPersonal ? 'rgba(26,18,8,0.96)' : 'rgba(14,22,36,0.96)',
      border: `1px solid ${isPersonal ? 'rgba(201,184,144,0.5)' : 'rgba(80,120,180,0.4)'}`,
      borderLeft: isPersonal ? '2px solid rgba(201,184,144,0.8)' : '2px solid rgba(100,148,200,0.8)',
      borderRadius: '8px', padding: '1rem 1.25rem', maxWidth: '360px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)',
      transform: visible ? 'translateX(0)' : 'translateX(20px)',
      opacity: visible ? 1 : 0,
      transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', display: 'inline-block',
              background: isPersonal ? '#c9b890' : '#6494c8',
              boxShadow: `0 0 6px ${isPersonal ? 'rgba(201,184,144,0.5)' : 'rgba(100,148,200,0.5)'}` }} />
            <span style={{ fontSize: '0.6rem', fontFamily: "'DM Mono', monospace", letterSpacing: '0.12em', textTransform: 'uppercase', color: isPersonal ? '#c9b890' : '#8ab0d8' }}>
              {isPersonal ? 'For you' : 'Discussion prompt'}
            </span>
          </div>
          <p style={{ color: '#f5edd8', fontSize: '0.9rem', lineHeight: 1.55, fontFamily: "'Crimson Pro', Georgia, serif" }}>{nudge.prompt}</p>
        </div>
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: '1.2rem', lineHeight: 1, padding: 0, flexShrink: 0 }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}>×</button>
      </div>
    </div>
  );
}

export default function SessionPage() {
  const { id } = useParams();
  const router = useRouter();

  const [token, setToken] = useState('');
  const [liveKitUrl, setLiveKitUrl] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [nudges, setNudges] = useState([]);
  const [openingQuestion, setOpeningQuestion] = useState(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [sessionInfo, setSessionInfo] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const mediaStreamRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        if (typeof window !== 'undefined') sessionStorage.setItem('redirectAfterLogin', '/session/' + id);
        router.push('/login?redirect=/session/' + id);
        return;
      }
      setAuthChecked(true);
      const meta = session.user.user_metadata;
      const autoName = meta?.full_name || meta?.name || session.user.email?.split('@')[0] || '';
      setNameInput(autoName);
      fetch(`${API}/api/sessions/${id}`)
        .then(r => r.json())
        .then(d => setSessionInfo(d))
        .catch(() => {});
    });
  }, [id]);

  // WebSocket for prompts
  useEffect(() => {
    if (!participantName || !id) return;
    const ws = new WebSocket(
      `${WS_URL}/ws?sessionId=${id}&role=participant&participantName=${encodeURIComponent(participantName)}`
    );
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);

        // Opening question — show prominent banner
        if (msg.event === 'SESSION_STARTED' && msg.data?.opening_question) {
          setOpeningQuestion(msg.data.opening_question);
        }

        // General scheduled prompt — broadcast to group
        if (msg.event === 'GENERAL_PROMPT') {
          const nudge = {
            id: Date.now(),
            prompt: msg.data.prompt,
            target: 'group',
            type: 'GENERAL_PROMPT',
          };
          setNudges(prev => [nudge, ...prev].slice(0, 3));
          // General prompts stay longer — 3 minutes
          setTimeout(() => setNudges(prev => prev.filter(n => n.id !== nudge.id)), 3 * 60 * 1000);
        }

        // Targeted AI intervention — personal nudge
        if (msg.event === 'AI_PROMPT' &&
          (msg.data.target === 'group' || msg.data.target === participantName)) {
          const nudge = { ...msg.data, id: Date.now() };
          setNudges(prev => [nudge, ...prev].slice(0, 4));
          // Personal nudges stay for 90 seconds
          setTimeout(() => setNudges(prev => prev.filter(n => n.id !== nudge.id)), 30000);
        }
      } catch (_) {}
    };

    return () => ws.close();
  }, [participantName, id]);

  async function joinSession() {
    const name = nameInput.trim();
    if (!name) return;
    setJoining(true);
    setJoinError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
        video: false,
      });
      mediaStreamRef.current = stream;
    } catch (err) {
      setJoinError(`Microphone: ${err.name} — audio transcription disabled. Video will still work.`);
    }

    try {
      const res = await fetch(`${API}/api/livekit/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName: id, participantName: name, isAdmin: false }),
      });
      if (!res.ok) throw new Error('Server ' + res.status);
      const data = await res.json();
      if (!data.token || !data.url) throw new Error('Missing token or URL');
      setToken(data.token);
      setLiveKitUrl(data.url);
      setParticipantName(name);
    } catch (err) {
      setJoinError('Could not join: ' + (err?.message || 'Unknown error'));
      setJoining(false);
      return;
    }

    setJoining(false);
  }

  if (!authChecked) return (
    <div style={{ minHeight: '100vh', background: '#0e0b06', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'rgba(201,184,144,0.3)', fontSize: '0.8rem', fontFamily: 'monospace' }}>…</span>
    </div>
  );

  // ─── Join screen ──────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div style={{ minHeight: '100vh', background: '#0e0b06', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: "'Crimson Pro', Georgia, serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Mono:wght@400;500&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          .join-input { width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 14px 16px; color: #f5edd8; font-family: 'Crimson Pro', Georgia, serif; font-size: 1.1rem; outline: none; transition: border-color 0.2s; margin-bottom: 1rem; }
          .join-input:focus { border-color: rgba(201,184,144,0.5); }
          .join-input::placeholder { color: rgba(245,237,216,0.3); }
          .join-btn { width: 100%; background: #c9b890; color: #0e0b06; border: none; padding: 14px; border-radius: 6px; font-family: 'Crimson Pro', Georgia, serif; font-size: 1.05rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
          .join-btn:hover:not(:disabled) { background: #ddd0b0; }
          .join-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        `}</style>

        <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 30% 50%, rgba(45,35,15,0.8) 0%, transparent 60%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', background: 'rgba(245,237,216,0.04)', border: '1px solid rgba(201,184,144,0.2)', borderRadius: '12px', padding: '2.5rem', width: '100%', maxWidth: '420px', backdropFilter: 'blur(20px)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#c9b890' }}>LearnLive</span>
            <span style={{ fontSize: '0.65rem', fontFamily: "'DM Mono', monospace", color: 'rgba(201,184,144,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Session</span>
          </div>

          {sessionInfo && (
            <div style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: '400', color: '#f5edd8', lineHeight: 1.25, marginBottom: '0.5rem' }}>{sessionInfo.title}</h1>
              {sessionInfo.topic && <p style={{ fontSize: '0.95rem', color: 'rgba(245,237,216,0.5)', fontStyle: 'italic', lineHeight: 1.4 }}>{sessionInfo.topic}</p>}
              {sessionInfo.group_name && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(201,184,144,0.1)', border: '1px solid rgba(201,184,144,0.25)', borderRadius: '4px', padding: '0.3rem 0.75rem', marginTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.6rem', fontFamily: "'DM Mono', monospace", color: 'rgba(201,184,144,0.55)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Group</span>
                  <span style={{ fontSize: '0.875rem', color: '#c9b890' }}>{sessionInfo.group_name}</span>
                </div>
              )}
            </div>
          )}

          <label style={{ display: 'block', fontSize: '0.68rem', fontFamily: "'DM Mono', monospace", color: 'rgba(201,184,144,0.65)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Your Name</label>
          <input className="join-input" value={nameInput} onChange={e => setNameInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && joinSession()} placeholder="Enter your full name" autoFocus />

          {joinError && <p style={{ color: '#e07060', fontSize: '0.8rem', fontFamily: "'DM Mono', monospace", marginBottom: '0.75rem', lineHeight: 1.4 }}>{joinError}</p>}

          <button className="join-btn" onClick={joinSession} disabled={joining || !nameInput.trim()}>
            {joining ? 'Joining…' : 'Join Session'}
          </button>

          <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.68rem', color: 'rgba(245,237,216,0.2)', fontFamily: "'DM Mono', monospace", lineHeight: 1.5 }}>
            Tapping Join will request microphone & camera access.<br />
            Use "I'm Speaking" to ensure accurate attribution.
          </p>
        </div>
      </div>
    );
  }

  // ─── Session screen ───────────────────────────────────────────────────────
  return (
    <div style={{ height: '100vh', background: '#0e0b06', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .lk-room-container { background: #0e0b06 !important; }
        .lk-grid-layout { background: #0e0b06 !important; gap: 6px !important; padding: 6px !important; padding-bottom: 150px !important; }
        .lk-participant-tile { border-radius: 8px !important; overflow: hidden !important; border: 1px solid rgba(201,184,144,0.1) !important; }
        .lk-participant-tile[data-lk-speaking="true"] { border-color: rgba(201,184,144,0.5) !important; box-shadow: 0 0 0 2px rgba(201,184,144,0.2) !important; }
        .lk-participant-name { font-family: 'Crimson Pro', Georgia, serif !important; font-size: 0.85rem !important; color: #f5edd8 !important; background: linear-gradient(transparent, rgba(14,11,6,0.85)) !important; padding: 0.5rem 0.75rem !important; }
        .lk-control-bar { background: rgba(14,11,6,0.92) !important; border-top: 1px solid rgba(201,184,144,0.15) !important; backdrop-filter: blur(20px) !important; padding: 0.75rem 1rem !important; }
        .lk-button { border-radius: 8px !important; background: rgba(255,255,255,0.1) !important; border: 1px solid rgba(255,255,255,0.18) !important; color: #f5edd8 !important; transition: all 0.2s !important; }
        .lk-button:hover { background: rgba(201,184,144,0.2) !important; border-color: rgba(201,184,144,0.45) !important; }
        .lk-button svg, .lk-button span { color: #f5edd8 !important; fill: #f5edd8 !important; stroke: #f5edd8 !important; }
        .lk-button[data-lk-muted="true"] { background: rgba(139,58,42,0.45) !important; border-color: rgba(180,80,60,0.5) !important; }
        .lk-disconnect-button { background: rgba(139,58,42,0.65) !important; border-color: rgba(200,80,60,0.55) !important; }
        .lk-disconnect-button:hover { background: rgba(180,60,40,0.9) !important; }
        .lk-disconnect-button svg { color: #fff !important; fill: #fff !important; stroke: #fff !important; }
        .lk-focus-layout { background: #0e0b06 !important; }
        .speaking-btn {
          position: fixed; bottom: 88px; left: 50%; transform: translateX(-50%);
          z-index: 200; border-radius: 50px; padding: 14px 36px;
          font-family: 'Crimson Pro', Georgia, serif; font-size: 1.05rem; font-weight: 500;
          cursor: pointer; transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
          white-space: nowrap; user-select: none; -webkit-user-select: none; touch-action: manipulation;
        }
        .speaking-btn.off { background: rgba(201,184,144,0.1); border: 1px solid rgba(201,184,144,0.3); color: #c9b890; }
        .speaking-btn.on { background: #c9b890; border: 1px solid #c9b890; color: #0e0b06; animation: speakpulse 2s ease-in-out infinite; }
        @keyframes speakpulse {
          0%,100% { box-shadow: 0 0 0 4px rgba(201,184,144,0.2), 0 0 24px rgba(201,184,144,0.25); }
          50% { box-shadow: 0 0 0 8px rgba(201,184,144,0.08), 0 0 36px rgba(201,184,144,0.35); }
        }
      `}</style>

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.25rem', background: 'linear-gradient(to bottom, rgba(14,11,6,0.88), transparent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#c9b890', fontFamily: "'Crimson Pro', Georgia, serif" }}>LearnLive</span>
          {sessionInfo?.topic && <span style={{ fontSize: '0.8rem', color: 'rgba(245,237,216,0.45)', fontFamily: "'Crimson Pro', Georgia, serif", fontStyle: 'italic' }}>{sessionInfo.topic}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2d6a4f', display: 'inline-block', boxShadow: '0 0 6px #2d6a4f' }} />
          <span style={{ fontSize: '0.62rem', fontFamily: "'DM Mono', monospace", color: '#2d6a4f', letterSpacing: '0.12em' }}>LIVE</span>
        </div>
      </div>

      {/* Opening question banner — full width, prominent, 60s */}
      {openingQuestion && (
        <OpeningQuestionBanner
          question={openingQuestion}
          onDismiss={() => setOpeningQuestion(null)}
        />
      )}

      {/* Speaking badge */}
      {isSpeaking && (
        <div style={{ position: 'absolute', top: '62px', left: '1.25rem', zIndex: 100, pointerEvents: 'none', background: 'rgba(201,184,144,0.14)', border: '1px solid rgba(201,184,144,0.38)', borderRadius: '6px', padding: '0.35rem 0.875rem', backdropFilter: 'blur(10px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#c9b890', display: 'inline-block' }} />
            <span style={{ fontSize: '0.75rem', color: '#c9b890', fontFamily: "'Crimson Pro', Georgia, serif" }}>{participantName} — speaking</span>
          </div>
        </div>
      )}

      {/* Nudge overlay — top right, stacked */}
      <div style={{ position: 'absolute', top: '72px', right: '1.25rem', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '360px', pointerEvents: 'none' }}>
        {nudges.map(nudge => (
          <div key={nudge.id} style={{ pointerEvents: 'all' }}>
            <NudgeCard nudge={nudge} onDismiss={() => setNudges(prev => prev.filter(n => n.id !== nudge.id))} />
          </div>
        ))}
      </div>

      {/* Name badge */}
      <div style={{ position: 'absolute', bottom: '148px', left: '1.25rem', zIndex: 50, pointerEvents: 'none', background: 'rgba(14,11,6,0.65)', border: '1px solid rgba(201,184,144,0.18)', borderRadius: '5px', padding: '0.35rem 0.875rem', backdropFilter: 'blur(8px)' }}>
        <span style={{ fontSize: '0.78rem', color: '#c9b890', fontFamily: "'Crimson Pro', Georgia, serif" }}>{participantName}</span>
      </div>

      {/* I'm Speaking toggle */}
      <button className={`speaking-btn ${isSpeaking ? 'on' : 'off'}`} onClick={() => setIsSpeaking(s => !s)}>
        🎙 I'm Speaking
      </button>

      <LiveKitRoom token={token} serverUrl={liveKitUrl} connect={true} video={true} audio={false} style={{ height: '100vh' }}>
        <VideoConference />
        <RoomAudioRenderer />
        <AudioStreamer
          sessionId={id} participantName={participantName}
          isSpeaking={isSpeaking} mediaStream={mediaStreamRef.current}
        />
      </LiveKitRoom>
    </div>
  );
}
