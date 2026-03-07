'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useRoomContext,
} from '@livekit/components-react';
import '@livekit/components-styles';

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

function AudioStreamer({ sessionId, participantName, isSpeaking }) {
  const room = useRoomContext();
  const audioNodeRef = useRef(null);
  const audioWsRef = useRef(null);
  const streamingRef = useRef(false);
  const isSpeakingRef = useRef(isSpeaking);

  // Keep ref in sync with prop
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);

  useEffect(() => {
    if (!room) return;

    async function startAudioStreaming() {
      if (streamingRef.current) return;
      streamingRef.current = true;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: { ideal: 16000 },
            channelCount: { ideal: 1 },
            latency: { ideal: 0 },
          },
          video: false,
        });
        const wsUrl = WS_URL + '/ws?sessionId=' + sessionId + '&type=audio&participant=' + encodeURIComponent(participantName);
        const audioWs = new WebSocket(wsUrl);
        audioWsRef.current = audioWs;

        audioWs.onopen = () => {
          const audioContext = new AudioContext({ sampleRate: 16000 });
          const source = audioContext.createMediaStreamSource(stream);
          const processor = audioContext.createScriptProcessor(4096, 1, 1);
          source.connect(processor);
          processor.connect(audioContext.destination);

          processor.onaudioprocess = (e) => {
            if (audioWs.readyState !== WebSocket.OPEN) return;
            const float32 = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(float32.length);
            for (let i = 0; i < float32.length; i++) {
              int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768));
            }

            const rms = computeRMS(int16);

            // Send RMS report so backend can pick dominant speaker
            audioWs.send(JSON.stringify({
              type: 'rms',
              rms: rms,
              manualOverride: isSpeakingRef.current,
            }));

            // Always send audio — backend decides whether to transcribe
            audioWs.send(int16.buffer);
          };

          audioNodeRef.current = { processor, source, audioContext };
        };

        audioWs.onerror = () => { streamingRef.current = false; };
        audioWs.onclose = () => {
          streamingRef.current = false;
          if (audioNodeRef.current) {
            try {
              audioNodeRef.current.processor.disconnect();
              audioNodeRef.current.source.disconnect();
              audioNodeRef.current.audioContext.close();
            } catch (e) {}
          }
        };
      } catch (err) {
        console.error('[Audio] Error:', err);
        streamingRef.current = false;
      }
    }

    if (room.state === 'connected') startAudioStreaming();
    room.on('connected', startAudioStreaming);

    return () => {
      if (audioNodeRef.current) {
        try {
          audioNodeRef.current.processor.disconnect();
          audioNodeRef.current.source.disconnect();
          audioNodeRef.current.audioContext.close();
        } catch (e) {}
      }
      if (audioWsRef.current) audioWsRef.current.close();
      streamingRef.current = false;
    };
  }, [room, sessionId, participantName]);

  return null;
}

function NudgeCard({ nudge, onDismiss }) {
  const isPersonal = nudge.target !== 'group';
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 50); }, []);

  return (
    <div style={{
      background: isPersonal ? 'rgba(26,18,8,0.96)' : 'rgba(20,35,60,0.96)',
      border: '1px solid ' + (isPersonal ? 'rgba(201,184,144,0.5)' : 'rgba(100,140,200,0.4)'),
      borderRadius: '8px', padding: '1rem 1.25rem',
      maxWidth: '360px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      backdropFilter: 'blur(12px)',
      transform: visible ? 'translateX(0)' : 'translateX(20px)',
      opacity: visible ? 1 : 0,
      transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isPersonal ? '#c9b890' : '#6494c8', display: 'inline-block', boxShadow: '0 0 6px ' + (isPersonal ? '#c9b890' : '#6494c8') }} />
            <span style={{ fontSize: '0.65rem', fontFamily: "'DM Mono', monospace", letterSpacing: '0.12em', textTransform: 'uppercase', color: isPersonal ? '#c9b890' : '#8ab0d8' }}>
              {isPersonal ? 'For you' : 'Group prompt'}
            </span>
          </div>
          <p style={{ color: '#f5edd8', fontSize: '0.9rem', lineHeight: 1.55, fontFamily: "'Crimson Pro', Georgia, serif" }}>{nudge.prompt}</p>
        </div>
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: '1.1rem', lineHeight: 1, padding: 0, flexShrink: 0, marginTop: '2px' }}
          onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.7)'}
          onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.3)'}>×</button>
      </div>
    </div>
  );
}

export default function SessionPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const [name, setName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [token, setToken] = useState('');
  const [liveKitUrl, setLiveKitUrl] = useState('');
  const [nudges, setNudges] = useState([]);
  const [joining, setJoining] = useState(false);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    const urlName = searchParams.get('name');
    if (urlName) setNameInput(urlName);
    fetch(API + '/api/sessions/' + id)
      .then(r => r.json())
      .then(d => setSessionInfo(d))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!name || !id) return;
    const ws = new WebSocket(WS_URL + '/ws?sessionId=' + id + '&role=participant&participantName=' + encodeURIComponent(name));
    wsRef.current = ws;
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.event === 'AI_PROMPT') {
        if (msg.data.target === 'group' || msg.data.target === name) {
          const nudge = { ...msg.data, id: Date.now() };
          setNudges(prev => [nudge, ...prev].slice(0, 4));
          setTimeout(() => setNudges(prev => prev.filter(n => n.id !== nudge.id)), 50000);
        }
      }
    };
    return () => ws.close();
  }, [name, id]);

  async function joinSession() {
    if (!nameInput.trim()) return;
    setJoining(true);
    try {
      const res = await fetch(API + '/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName: id, participantName: nameInput.trim(), isAdmin: false }),
      });
      const data = await res.json();
      setToken(data.token);
      setLiveKitUrl(data.url);
      setName(nameInput.trim());
    } catch (err) { alert('Could not join. Please try again.'); }
    setJoining(false);
  }

  // JOIN SCREEN
  if (!token) {
    return (
      <div style={{ minHeight: '100vh', background: '#0e0b06', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: "'Crimson Pro', Georgia, serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Mono:wght@400;500&display=swap');
          * { box-sizing: border-box; }
          .join-input { width: 100%; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 14px 16px; color: #f5edd8; font-family: 'Crimson Pro', Georgia, serif; font-size: 1.1rem; outline: none; transition: border-color 0.2s; margin-bottom: 1rem; }
          .join-input:focus { border-color: rgba(201,184,144,0.5); }
          .join-input::placeholder { color: rgba(245,237,216,0.3); }
          .join-btn { width: 100%; background: #c9b890; color: #0e0b06; border: none; padding: 14px; border-radius: 6px; font-family: 'Crimson Pro', Georgia, serif; font-size: 1.05rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
          .join-btn:hover:not(:disabled) { background: #ddd0b0; }
          .join-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        `}</style>
        <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 30% 50%, rgba(45,35,15,0.8) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', background: 'rgba(245,237,216,0.04)', border: '1px solid rgba(201,184,144,0.2)', borderRadius: '12px', padding: '2.5rem', width: '100%', maxWidth: '420px', backdropFilter: 'blur(20px)' }}>
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#c9b890' }}>LearnLive</span>
              <span style={{ fontSize: '0.65rem', fontFamily: "'DM Mono', monospace", color: 'rgba(201,184,144,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Session</span>
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '400', color: '#f5edd8', lineHeight: 1.2, marginBottom: '0.5rem' }}>{sessionInfo?.title || 'Join Discussion'}</h1>
            {sessionInfo?.topic && <p style={{ fontSize: '0.95rem', color: 'rgba(245,237,216,0.5)', fontStyle: 'italic' }}>{sessionInfo.topic}</p>}
          </div>
          <label style={{ display: 'block', fontSize: '0.7rem', fontFamily: "'DM Mono', monospace", color: 'rgba(201,184,144,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Your Name</label>
          <input className="join-input" value={nameInput} onChange={e => setNameInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && joinSession()} placeholder="Enter your full name" autoFocus />
          <button className="join-btn" onClick={joinSession} disabled={joining || !nameInput.trim()}>{joining ? 'Joining...' : 'Join Session'}</button>
          <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.75rem', color: 'rgba(245,237,216,0.25)', fontFamily: "'DM Mono', monospace" }}>
            Tap "I'm Speaking" when contributing to ensure accurate attribution
          </p>
        </div>
      </div>
    );
  }

  // SESSION SCREEN
  return (
    <div style={{ height: '100vh', background: '#0e0b06', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;1,400&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .lk-room-container { background: #0e0b06 !important; }
        .lk-grid-layout { background: #0e0b06 !important; gap: 6px !important; padding: 6px !important; padding-bottom: 140px !important; }
        .lk-participant-tile { border-radius: 8px !important; overflow: hidden !important; border: 1px solid rgba(201,184,144,0.1) !important; }
        .lk-participant-tile:hover { border-color: rgba(201,184,144,0.25) !important; }
        .lk-participant-name { font-family: 'Crimson Pro', Georgia, serif !important; font-size: 0.85rem !important; color: #f5edd8 !important; background: linear-gradient(transparent, rgba(14,11,6,0.85)) !important; padding: 0.5rem 0.75rem !important; }
        .lk-control-bar { background: rgba(14,11,6,0.9) !important; border-top: 1px solid rgba(201,184,144,0.15) !important; backdrop-filter: blur(20px) !important; padding: 0.75rem 1rem !important; }
        .lk-button { border-radius: 8px !important; background: rgba(255,255,255,0.12) !important; border: 1px solid rgba(255,255,255,0.2) !important; transition: all 0.2s !important; color: #f5edd8 !important; }
        .lk-button:hover { background: rgba(201,184,144,0.25) !important; border-color: rgba(201,184,144,0.5) !important; color: #fff !important; }
        .lk-button svg { color: #f5edd8 !important; fill: #f5edd8 !important; stroke: #f5edd8 !important; }
        .lk-button span { color: #f5edd8 !important; }
        .lk-disconnect-button { background: rgba(139,58,42,0.7) !important; border-color: rgba(200,80,60,0.6) !important; color: #fff !important; }
        .lk-disconnect-button:hover { background: rgba(180,60,40,0.95) !important; }
        .lk-disconnect-button svg { color: #fff !important; fill: #fff !important; stroke: #fff !important; }
        .lk-button[aria-pressed="true"] { background: rgba(201,184,144,0.3) !important; border-color: rgba(201,184,144,0.6) !important; }
        .lk-button[data-lk-muted="true"] { background: rgba(139,58,42,0.5) !important; }
        .lk-focus-layout { background: #0e0b06 !important; }

        .speaking-btn {
          position: fixed;
          bottom: 90px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 200;
          border: none;
          border-radius: 50px;
          padding: 0.875rem 2.5rem;
          font-family: 'Crimson Pro', Georgia, serif;
          font-size: 1.05rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          letter-spacing: 0.02em;
          white-space: nowrap;
        }
        .speaking-btn.inactive {
          background: rgba(201,184,144,0.12);
          border: 1px solid rgba(201,184,144,0.35);
          color: #c9b890;
          box-shadow: none;
        }
        .speaking-btn.inactive:hover {
          background: rgba(201,184,144,0.2);
          border-color: rgba(201,184,144,0.6);
        }
        .speaking-btn.active {
          background: #c9b890;
          color: #0e0b06;
          box-shadow: 0 0 0 4px rgba(201,184,144,0.25), 0 0 20px rgba(201,184,144,0.3);
          animation: speakpulse 2s ease-in-out infinite;
        }
        @keyframes speakpulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(201,184,144,0.25), 0 0 20px rgba(201,184,144,0.3); }
          50% { box-shadow: 0 0 0 8px rgba(201,184,144,0.1), 0 0 30px rgba(201,184,144,0.4); }
        }
        @keyframes nudge-in {
          from { opacity: 0; transform: translateX(24px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem', background: 'linear-gradient(to bottom, rgba(14,11,6,0.9), transparent)', pointerEvents: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#c9b890', fontFamily: "'Crimson Pro', Georgia, serif" }}>LearnLive</span>
          {sessionInfo && <span style={{ fontSize: '0.8rem', color: 'rgba(245,237,216,0.5)', fontFamily: "'Crimson Pro', Georgia, serif", fontStyle: 'italic' }}>{sessionInfo.topic}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2d6a4f', display: 'inline-block', boxShadow: '0 0 6px #2d6a4f' }} />
          <span style={{ fontSize: '0.65rem', fontFamily: "'DM Mono', monospace", color: '#2d6a4f', letterSpacing: '0.1em' }}>LIVE</span>
        </div>
      </div>

      {/* Nudge overlay */}
      <div style={{ position: 'absolute', top: '72px', right: '1.25rem', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '360px', pointerEvents: 'none' }}>
        {nudges.map(nudge => (
          <div key={nudge.id} style={{ pointerEvents: 'all' }}>
            <NudgeCard nudge={nudge} onDismiss={() => setNudges(prev => prev.filter(n => n.id !== nudge.id))} />
          </div>
        ))}
      </div>

      {/* Speaking indicator — who is currently active */}
      {isSpeaking && (
        <div style={{ position: 'absolute', top: '72px', left: '1.25rem', zIndex: 100, background: 'rgba(201,184,144,0.15)', border: '1px solid rgba(201,184,144,0.4)', borderRadius: '6px', padding: '0.4rem 0.875rem', backdropFilter: 'blur(10px)', pointerEvents: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#c9b890', display: 'inline-block', animation: 'speakpulse 1s infinite' }} />
            <span style={{ fontSize: '0.75rem', color: '#c9b890', fontFamily: "'Crimson Pro', Georgia, serif" }}>{name} is speaking</span>
          </div>
        </div>
      )}

      {/* Name badge */}
      <div style={{ position: 'absolute', bottom: '145px', left: '1.25rem', zIndex: 50, background: 'rgba(14,11,6,0.7)', border: '1px solid rgba(201,184,144,0.2)', borderRadius: '6px', padding: '0.4rem 0.875rem', backdropFilter: 'blur(10px)', pointerEvents: 'none' }}>
        <span style={{ fontSize: '0.8rem', color: '#c9b890', fontFamily: "'Crimson Pro', Georgia, serif" }}>{name}</span>
      </div>

      {/* I'm Speaking toggle */}
      <button
        className={`speaking-btn ${isSpeaking ? 'active' : 'inactive'}`}
        onClick={() => setIsSpeaking(s => !s)}
      >
        {isSpeaking ? '🎙 I\'m Speaking' : '🎙 I\'m Speaking'}
      </button>

      {/* LiveKit */}
      <LiveKitRoom token={token} serverUrl={liveKitUrl} connect={true} video={true} audio={true} style={{ height: '100vh' }}>
        <VideoConference />
        <RoomAudioRenderer />
        <AudioStreamer sessionId={id} participantName={name} isSpeaking={isSpeaking} />
      </LiveKitRoom>
    </div>
  );
}
