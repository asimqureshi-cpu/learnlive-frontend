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
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('[Audio] Microphone access granted');

        const wsUrl = WS_URL + '/ws?sessionId=' + sessionId + '&type=audio&participant=' + encodeURIComponent(participantName);
        console.log('[Audio] Connecting to:', wsUrl);

        const audioWs = new WebSocket(wsUrl);
        audioWsRef.current = audioWs;

        audioWs.onopen = function() {
          console.log('[Audio] WebSocket connected, starting MediaRecorder');

          var mimeType = '';
          if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            mimeType = 'audio/webm;codecs=opus';
          } else if (MediaRecorder.isTypeSupported('audio/webm')) {
            mimeType = 'audio/webm';
          }

          console.log('[Audio] Using mimeType:', mimeType || 'default');

          var options = mimeType ? { mimeType: mimeType } : {};
          var mediaRecorder = new MediaRecorder(stream, options);
          mediaRecorderRef.current = mediaRecorder;

          mediaRecorder.ondataavailable = function(event) {
            if (event.data.size > 0 && audioWs.readyState === WebSocket.OPEN) {
              audioWs.send(event.data);
              console.log('[Audio] Sent chunk:', event.data.size, 'bytes');
            }
          };

          mediaRecorder.onerror = function(e) {
            console.error('[Audio]
