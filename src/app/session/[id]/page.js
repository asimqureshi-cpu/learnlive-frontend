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

function AudioStreamer({ sessionId, participantName }) {
  const room = useRoomContext();
  const mediaRecorderRef = useRef(null);
  const audioWsRef = useRef(null);
  const streamingRef = useRef(false);

  useEffect(() => {
    if (!room) return;

    async function startAudioStreaming() {
      if (streamingRef.current) return;
      streamingRef.current = true;
      console.log('[Audio] Starting...');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('[Audio] Mic granted');

        const wsUrl = WS_URL + '/ws?sessionId=' + sessionId + '&type=audio&participant=' + encodeURIComponent(participantName);
        console.log('[Audio] Connecting:', wsUrl);

        const audioWs = new WebSocket(wsUrl);
        audioWsRef.current = audioWs;

        audioWs.onopen = () => {
          console.log('[Audio] Connected');
          let mimeType = '';
          if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            mimeType = 'audio/webm;codecs=opus';
          } else if (MediaRecorder.isTypeSupported('audio/webm')) {
            mimeType = 'audio/webm';
          }
          const opts = mimeType ? { mimeType } : {};
          const recorder = new MediaRecorder(stream, opts);
          mediaRecorderRef.current = recorder;
          recorder.ondataavailable = (ev) => {
            if (ev.data.size > 0 && audioWs.readyState === WebSocket.OPEN) {
              audioWs.send(ev.data);
              console.log('[Audio] Chunk sent:', ev.data.size);
            }
          };
          recorder.start(250);
          console.log('[Audio] Recording started');
        };

        audioWs.onmessage = (e) => console.log('[Audio] Server:', e.data);
        audioWs.onerror = (e) => { console.error('[Audio] WS error', e); streamingRef.current = false; };
        audioWs.onclose = (e) => {
          console.log('[Audio] Closed code:', e.code);
          streamingRef.current = false;
          if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
        };

      } catch (err) {
        console.error('[Audio] Error:', err);
        streamingRef.current = false;
      }
    }

    if (room.state === 'connected') {
      startAudioStreaming();
    }
    room.on('connected', startAudioStreaming);

    return () => {
      if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
      if (audioWsRef.current) audioWsRef.current.close();
      streamingRef.current = false;
    };
  }, [room, sessionId, participantName]);

  return null;
}

export default function SessionPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const [name, setName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [token, setToken] = useState('');
  const [liveKitUrl, setLiveKitUrl] = useState('');
  const [prompts, setPrompts] = useState([]);
  const [joining, setJoining] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    const urlName = searchParams.get('name');
    if (urlName) setNameInput(urlName);
  }, [searchParams]);

  useEffect(() => {
    if (!name || !id) return;
    const ws = new WebSocket(
      WS_URL + '/ws?sessionId=' + id + '&role=participant&participantName=' + encodeURIComponent(name)
    );
    wsRef.current = ws;
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.event === 'AI_PROMPT') {
        if (msg.data.target === 'group' || msg.data.target === name) {
          const p = Object.assign({}, msg.data, { id: Date.now() });
          setPrompts((prev) => [p, ...prev]);
          setTimeout(() => setPrompts((prev) => prev.filter((x) => x.id !== p.id)), 45000);
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
    } catch (err) {
      alert('Could not join. Please try again.');
    }
    setJoining(false);
  }

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f172a,#1a2f5e)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '400px' }}>
          <h1 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Join Discussion</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Enter your name to join.</p>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') joinSession(); }}
            placeholder="Your full name"
            style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', padding: '12px 16px', color: 'white', fontSize: '0.875rem', marginBottom: '1rem', boxSizing: 'border-box', outline: 'none' }}
          />
          <button
            onClick={joinSession}
            disabled={joining || !nameInput.trim()}
            style={{ width: '100%', background: '#e8622a', color: 'white', padding: '12px', borderRadius: '12px', fontSize: '0.875rem', fontWeight: '500', border: 'none', cursor: 'pointer', opacity: (joining || !nameInput.trim()) ? 0.4 : 1 }}
          >
            {joining ? 'Joining...' : 'Join Session'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', background: '#0f172a', position: 'relative' }}>
      {prompts.length > 0 && (
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '320px' }}>
          {prompts.map((p) => (
            <div key={p.id} style={{ background: 'rgba(26,47,94,0.95)', border: '1px solid rgba(45,74,138,0.5)', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div>
                  <p style={{ color: '#e8622a', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    {p.target === 'group' ? 'Group Prompt' : 'For you, ' + name}
                  </p>
                  <p style={{ color: 'white', fontSize: '0.875rem', lineHeight: '1.5' }}>{p.prompt}</p>
                </div>
                <button onClick={() => setPrompts((prev) => prev.filter((x) => x.id !== p.id))} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}>x</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <LiveKitRoom token={token} serverUrl={liveKitUrl} connect={true} video={true} audio={true} style={{ height: '100vh' }}>
        <VideoConference />
        <RoomAudioRenderer />
        <AudioStreamer sessionId={id} participantName={name} />
      </LiveKitRoom>
    </div>
  );
}
