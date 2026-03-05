'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from '@livekit/components-react';
import '@livekit/components-styles';

const API = process.env.NEXT_PUBLIC_BACKEND_URL;
const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

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
    // Pre-fill name from URL if provided
    const urlName = searchParams.get('name');
    if (urlName) setNameInput(urlName);
  }, [searchParams]);

  // Connect WebSocket when in session to receive prompts
  useEffect(() => {
    if (!name || !id) return;

    const ws = new WebSocket(`${WS_URL}/ws?sessionId=${id}&role=participant&participantName=${encodeURIComponent(name)}`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const { event, data } = JSON.parse(e.data);
      if (event === 'AI_PROMPT') {
        if (data.target === 'group' || data.target === name) {
          const promptEntry = { ...data, id: Date.now() };
          setPrompts(prev => [promptEntry, ...prev]);
          // Auto-dismiss after 45 seconds
          setTimeout(() => setPrompts(prev => prev.filter(p => p.id !== promptEntry.id)), 45000);
        }
      }
    };

    return () => ws.close();
  }, [name, id]);

  async function joinSession() {
    if (!nameInput.trim()) return;
    setJoining(true);
    try {
      const res = await fetch(`${API}/api/livekit/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName: id, participantName: nameInput.trim(), isAdmin: false }),
      });
      const data = await res.json();
      setToken(data.token);
      setLiveKitUrl(data.url);
      setName(nameInput.trim());
    } catch (err) {
      alert('Could not join session. Please check the link and try again.');
    }
    setJoining(false);
  }

  // Pre-join screen
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 to-brand flex items-center justify-center p-4">
        <div className="bg-white/5 backdrop-blur border border-white/15 rounded-2xl p-8 w-full max-w-md">
          <h1 className="font-display text-2xl font-bold text-white mb-2">Join Discussion</h1>
          <p className="text-slate-400 text-sm mb-6">Enter your name to join the learning session.</p>
          <input
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && joinSession()}
            placeholder="Your full name"
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-accent mb-4"
          />
          <button
            onClick={joinSession}
            disabled={joining || !nameInput.trim()}
            className="w-full bg-accent hover:bg-orange-600 disabled:opacity-40 text-white py-3 rounded-xl text-sm font-medium transition-all"
          >
            {joining ? 'Joining...' : 'Join Session →'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 flex flex-col">
      {/* Prompt notifications — floats over video */}
      {prompts.length > 0 && (
        <div className="absolute top-4 right-4 z-50 space-y-3 max-w-sm">
          {prompts.map(p => (
            <div key={p.id} className="prompt-toast bg-brand/95 backdrop-blur border border-brand-light/50 rounded-xl p-4 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-accent text-xs font-semibold uppercase tracking-wider mb-1">
                    {p.target === 'group' ? '💬 Group Prompt' : `💬 For you, ${name}`}
                  </p>
                  <p className="text-white text-sm leading-relaxed">"{p.prompt}"</p>
                </div>
                <button onClick={() => setPrompts(prev => prev.filter(x => x.id !== p.id))}
                  className="text-slate-400 hover:text-white text-lg leading-none shrink-0">×</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LiveKit video room */}
      <LiveKitRoom
        token={token}
        serverUrl={liveKitUrl}
        connect={true}
        video={true}
        audio={true}
        style={{ height: '100%' }}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
