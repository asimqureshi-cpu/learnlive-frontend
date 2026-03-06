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
      console.log('[Audio] Starting audio streaming...');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 16000,
          }
        });
        console.log('[Audio] Microphone access granted');

        const wsUrl = `${WS_URL}/ws/audio?sessionId=${sessionId}&participant=${encodeURIComponent(participantName)}`;
        console.log('[Audio] Connecting to:', wsUrl);
        
        const audioWs = new WebSocket(wsUrl);
        audioWsRef.current = audioWs;

        audioWs.onopen = () => {
          console.log('[Audio] WebSocket connected — starting MediaRecorder');
          
          const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : '';

          console.log('[Audio] Using mimeType:', mimeType || 'default');
          
          const mediaRecorder = new MediaRecorder(
            stream,
            mimeType ? { mimeType } : {}
          );
          mediaRecorderRef.current = mediaRecorder;

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && audioWs.readyState === WebSocket.OPEN) {
              audioWs.send(event.data);
              console.log('[Audio] Sent chunk:', event.data.size, 'bytes');
            }
          };

          mediaRecorder.onerror = (e) => console.error('[Audio] MediaRecorder error:', e);
          mediaRecorder.onstart = () => console.log('[Audio] MediaRecorder started');
          
          mediaRecorder.start(250);
        };

        audioWs.onmessage = (e) => console.log('[Audio] Server message:', e.data);
        audioWs.onerror = (err) => {
          console.error('[Audio] WebSocket error:', err);
          streamingRef.current = false;
        };
        audioWs.onclose = (e) => {
          console.log('[Audio] WebSocket closed — code:', e.code, 'reason:', e.reason);
          streamingRef.current = false;
          if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
        };

      } catch (err) {
        console.error('[Audio] Failed to start:', err);
        streamingRef.current = false;
      }
    }

    // Try immediately if already connected
    if (room.state === 'connected') {
      console.log('[Audio] Room already connected, starting immediately');
      startAudioStreaming();
    }

    // Also listen for connected event
    room.on('connected', () => {
      console.log('[Audio] Room connected event fired');
      startAudioStreaming();
    });

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
      `${WS_URL}/ws?sessionId=${id}&role=participant&participantName=${encodeURIComponent(name)}`
    );
    wsRef.current = ws;
    ws.onmessage = (e) => {
      const { event, data } = JSON.parse(e.data);
      if (event === 'AI_PROMPT') {
        if (data.target === 'group' || data.target === name) {
          const promptEntry = { ...data, id: Date.now() };
          setPrompts(prev => [promptEntry, ...prev]);
          setTimeout(
            () => setPrompts(prev => prev.filter(p => p.id !== promptEntry.id)),
            45000
          );
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
        headers: { 'Content-Type': 'applicatio
