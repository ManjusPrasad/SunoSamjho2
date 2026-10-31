import { useCallback, useEffect, useRef, useState } from 'react';
import { getPrismaDictationWebSocketUrl } from '../services/api';

export type PrismaDictationStatus = 'idle' | 'connecting' | 'listening' | 'processing';

interface PrismaEvent {
  type?: string;
  message?: string;
  text?: string;
}

interface PrismaRealtimeOptions {
  onTranscript: (text: string) => void;
  onError: (message: string) => void;
}

const frameDurationMs = 32;
const finalSilenceFrames = 30;
const finalTranscriptWaitMs = 1200;
const connectionTimeoutMs = 15_000;

export function usePrismaRealtimeDictation({ onTranscript, onError }: PrismaRealtimeOptions) {
  const [status, setStatus] = useState<PrismaDictationStatus>('idle');
  const statusRef = useRef<PrismaDictationStatus>('idle');
  const mountedRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  const socketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<AudioWorkletNode | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const finalWaitTimerRef = useRef<number | null>(null);
  const stopResolveRef = useRef<(() => void) | null>(null);
  const stoppingRef = useRef(false);
  const cancelledRef = useRef(false);

  onTranscriptRef.current = onTranscript;
  onErrorRef.current = onError;

  const setDictationStatus = useCallback((next: PrismaDictationStatus) => {
    statusRef.current = next;
    if (mountedRef.current) setStatus(next);
  }, []);

  const releaseAudio = useCallback(async () => {
    if (silenceTimerRef.current !== null) {
      window.clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.port.onmessage = null;
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const context = contextRef.current;
    contextRef.current = null;
    if (context && context.state !== 'closed') await context.close();
  }, []);

  const closeSocket = useCallback(() => {
    const socket = socketRef.current;
    socketRef.current = null;
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      socket.close(1000, 'Dictation stopped');
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelledRef.current = true;
      if (silenceTimerRef.current !== null) window.clearInterval(silenceTimerRef.current);
      if (finalWaitTimerRef.current !== null) window.clearTimeout(finalWaitTimerRef.current);
      stopResolveRef.current?.();
      processorRef.current?.port.close();
      processorRef.current?.disconnect();
      sourceRef.current?.disconnect();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (contextRef.current && contextRef.current.state !== 'closed') void contextRef.current.close();
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        socket.close(1000, 'Dictation view closed');
      }
    };
  }, []);

  const start = useCallback(async (language: string) => {
    if (statusRef.current !== 'idle') return;
    cancelledRef.current = false;
    stoppingRef.current = false;
    setDictationStatus('connecting');

    try {
      if (!window.isSecureContext && window.location.hostname !== 'localhost') {
        throw new Error('Phone browsers require a trusted HTTPS page for microphone access. You can upload an audio file instead.');
      }
      if (!navigator.mediaDevices?.getUserMedia || typeof AudioWorkletNode === 'undefined') {
        throw new Error('Live microphone transcription is not supported in this browser. Upload a WAV, WebM, OGG, MP3, or M4A file instead.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: { ideal: 1 },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (cancelledRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;

      const socket = new WebSocket(getPrismaDictationWebSocketUrl(language));
      socket.binaryType = 'arraybuffer';
      socketRef.current = socket;

      let ready = false;
      let resolveReady!: () => void;
      let rejectReady!: (error: Error) => void;
      const readyPromise = new Promise<void>((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
      });
      const readyTimeout = window.setTimeout(() => {
        if (!ready) rejectReady(new Error('Gnani Prisma did not become ready in time. Check the API connection and try again.'));
      }, connectionTimeoutMs);

      socket.onmessage = (event: MessageEvent<string>) => {
        if (!mountedRef.current || typeof event.data !== 'string') return;
        let message: PrismaEvent;
        try {
          message = JSON.parse(event.data) as PrismaEvent;
        } catch {
          onErrorRef.current('The Prisma speech service returned an unreadable response.');
          return;
        }

        if (message.type === 'connected') {
          ready = true;
          window.clearTimeout(readyTimeout);
          resolveReady();
          return;
        }
        if (message.type === 'error') {
          const errorMessage = message.message || 'Prisma transcription failed. Check the server configuration and retry.';
          if (!ready) rejectReady(new Error(errorMessage));
          else onErrorRef.current(errorMessage);
          return;
        }
        if (message.type === 'processing') {
          setDictationStatus('processing');
          return;
        }
        if (message.type === 'transcript') {
          const text = message.text?.trim();
          if (text) onTranscriptRef.current(text);
          if (!stoppingRef.current) setDictationStatus('listening');
        }
      };

      socket.onerror = () => {
        const error = new Error('Could not connect to the local Prisma speech proxy. Check that the API is running.');
        if (!ready) rejectReady(error);
        else if (mountedRef.current) onErrorRef.current(error.message);
      };

      socket.onclose = (event) => {
        window.clearTimeout(readyTimeout);
        if (!ready && !cancelledRef.current) {
          rejectReady(new Error(event.reason || 'Prisma transcription connection closed before it was ready.'));
          return;
        }
        if (mountedRef.current && !stoppingRef.current && event.code !== 1000 && !cancelledRef.current) {
          onErrorRef.current(event.reason || 'The Prisma transcription stream ended unexpectedly. Retry the recording.');
        }
        void releaseAudio().then(() => setDictationStatus('idle'));
      };

      await readyPromise;
      if (cancelledRef.current) return;

      const context = new AudioContext({ latencyHint: 'interactive' });
      contextRef.current = context;
      if (!context.audioWorklet) {
        throw new Error('Live microphone transcription requires a browser with AudioWorklet support. Upload an audio file instead.');
      }
      await context.audioWorklet.addModule(new URL('../worklets/prismaPcmProcessor.js', import.meta.url));
      await context.resume();
      const source = context.createMediaStreamSource(stream);
      sourceRef.current = source;
      const processor = new AudioWorkletNode(context, 'prisma-pcm-capture', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 1,
        channelCountMode: 'explicit',
        channelInterpretation: 'speakers',
      });
      processorRef.current = processor;
      const silentOutput = context.createGain();
      silentOutput.gain.value = 0;
      source.connect(processor);
      processor.connect(silentOutput);
      silentOutput.connect(context.destination);
      processor.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        if (event.data.byteLength !== 1024) {
          onErrorRef.current('The microphone produced an invalid audio frame. Restart the recording.');
          return;
        }
        if (socket.readyState === WebSocket.OPEN) socket.send(event.data);
      };
      if (cancelledRef.current) {
        await releaseAudio();
        closeSocket();
        setDictationStatus('idle');
        return;
      }
      setDictationStatus('listening');
    } catch (cause) {
      await releaseAudio();
      closeSocket();
      setDictationStatus('idle');
      if (!cancelledRef.current) {
        onErrorRef.current(cause instanceof Error ? cause.message : 'Could not start Prisma transcription.');
      }
    }
  }, [closeSocket, releaseAudio, setDictationStatus]);

  const stop = useCallback(async () => {
    if (statusRef.current === 'idle' || stoppingRef.current) return;
    stoppingRef.current = true;
    cancelledRef.current = statusRef.current === 'connecting';
    setDictationStatus('processing');

    const socket = socketRef.current;
    const isConnected = socket?.readyState === WebSocket.OPEN;
    await releaseAudio();
    if (isConnected) {
      const silence = new Int16Array(512);
      let sentFrames = 0;
      await new Promise<void>((resolve) => {
        const finish = () => {
          if (silenceTimerRef.current !== null) {
            window.clearInterval(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          if (finalWaitTimerRef.current !== null) {
            window.clearTimeout(finalWaitTimerRef.current);
            finalWaitTimerRef.current = null;
          }
          stopResolveRef.current = null;
          resolve();
        };
        stopResolveRef.current = finish;
        silenceTimerRef.current = window.setInterval(() => {
          if (!socket || socket.readyState !== WebSocket.OPEN) {
            finish();
            return;
          }
          if (sentFrames >= finalSilenceFrames) return;
          socket.send(silence.buffer.slice(0));
          sentFrames += 1;
          if (sentFrames >= finalSilenceFrames) {
            if (silenceTimerRef.current !== null) {
              window.clearInterval(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }
            finalWaitTimerRef.current = window.setTimeout(finish, finalTranscriptWaitMs);
          }
        }, frameDurationMs);
      });
    }

    cancelledRef.current = true;
    closeSocket();
    stoppingRef.current = false;
    setDictationStatus('idle');
  }, [closeSocket, releaseAudio, setDictationStatus]);

  return { status, start, stop };
}
