import { useState, useRef, useEffect, useCallback } from 'react';

export interface AudioPipelineOptions {
  onAudioSegmentReady?: (audioBase64: string) => void;
  vadThreshold?: number; // RMS threshold
  silenceThresholdMs?: number; // Ms of silence before cutting segment
}

const encodeMonoWav = (audioBuffer: AudioBuffer, targetSampleRate = 16000): Blob => {
  const input = audioBuffer.getChannelData(0);
  const outputLength = Math.max(1, Math.floor(input.length * targetSampleRate / audioBuffer.sampleRate));
  const buffer = new ArrayBuffer(44 + outputLength * 2);
  const view = new DataView(buffer);
  const writeText = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
  };

  writeText(0, 'RIFF');
  view.setUint32(4, 36 + outputLength * 2, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetSampleRate, true);
  view.setUint32(28, targetSampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, 'data');
  view.setUint32(40, outputLength * 2, true);

  for (let index = 0; index < outputLength; index += 1) {
    const position = index * audioBuffer.sampleRate / targetSampleRate;
    const before = Math.floor(position);
    const after = Math.min(before + 1, input.length - 1);
    const fraction = position - before;
    const sample = Math.max(-1, Math.min(1, input[before] * (1 - fraction) + input[after] * fraction));
    view.setInt16(44 + index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
};

export function useAudioPipeline(options: AudioPipelineOptions = {}) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micLevel, setMicLevel] = useState(0); // 0 to 100
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const vadThreshold = options.vadThreshold ?? 0.025;
  const silenceThresholdMs = options.silenceThresholdMs ?? 850;
  const lastSpokeTimeRef = useRef<number>(0);
  const speechStartedRef = useRef<boolean>(false);
  const isPlayingRef = useRef<boolean>(false);

  // Playback FIFO queue
  const audioQueueRef = useRef<{ audioBase64: string; mimeType: string }[]>([]);

  // Request Microphone Permissions and initialize audio graph
  const initializeMic = useCallback(async () => {
    try {
      setPermissionError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000,
        },
      });

      mediaStreamRef.current = stream;
      setHasPermission(true);

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx({ sampleRate: 16000 });
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Setup MediaRecorder for audio segment capture
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (recordedChunksRef.current.length > 0) {
          const recordedBlob = new Blob(recordedChunksRef.current, { type: mimeType });
          recordedChunksRef.current = [];

          try {
            // Prisma REST accepts WAV; decode browser recorder audio and package mono 16 kHz PCM.
            const audioContext = audioContextRef.current;
            if (!audioContext) throw new Error('Audio context is unavailable. Please re-enable your microphone.');
            const decoded = await audioContext.decodeAudioData(await recordedBlob.arrayBuffer());
            const wavBlob = encodeMonoWav(decoded);
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64Data = (reader.result as string).split(',')[1];
              if (base64Data && options.onAudioSegmentReady) options.onAudioSegmentReady(base64Data);
            };
            reader.readAsDataURL(wavBlob);
          } catch (error) {
            setPermissionError(error instanceof Error ? `Could not prepare speech audio: ${error.message}` : 'Could not prepare speech audio.');
          }
        }
      };

      // VAD polling loop
      const buffer = new Float32Array(analyser.fftSize);
      let animFrameId: number;

      const checkAudio = () => {
        if (!analyserRef.current || isMuted) {
          setMicLevel(0);
          animFrameId = requestAnimationFrame(checkAudio);
          return;
        }

        analyserRef.current.getFloatTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i] * buffer[i];
        }
        const rms = Math.sqrt(sum / buffer.length);
        const levelPct = Math.min(100, Math.round(rms * 400));
        setMicLevel(levelPct);

        const now = Date.now();

        // Gating: If synthetic audio is currently playing, ignore mic to prevent feedback loops
        if (isPlayingRef.current) {
          animFrameId = requestAnimationFrame(checkAudio);
          return;
        }

        if (rms > vadThreshold) {
          lastSpokeTimeRef.current = now;
          if (!speechStartedRef.current) {
            speechStartedRef.current = true;
            setIsSpeaking(true);
            recordedChunksRef.current = [];
            try {
              if (recorder.state === 'inactive') recorder.start(100);
            } catch {
              // ignore recorder re-entry
            }
          }
        } else if (speechStartedRef.current) {
          // Check silence duration
          if (now - lastSpokeTimeRef.current > silenceThresholdMs) {
            speechStartedRef.current = false;
            setIsSpeaking(false);
            try {
              if (recorder.state === 'recording') recorder.stop();
            } catch {
              // ignore
            }
          }
        }

        animFrameId = requestAnimationFrame(checkAudio);
      };

      animFrameId = requestAnimationFrame(checkAudio);

      return () => {
        cancelAnimationFrame(animFrameId);
      };
    } catch (err: any) {
      setHasPermission(false);
      setPermissionError(
        err.name === 'NotAllowedError'
          ? 'Microphone access was denied. Please allow microphone permissions in your browser settings to speak.'
          : err.message || 'Could not access audio device.'
      );
    }
  }, [isMuted, vadThreshold, silenceThresholdMs, options]);

  // Sequential audio playback queue
  const playNextInQueue = useCallback(() => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsPlayingAudio(false);
      return;
    }

    const item = audioQueueRef.current.shift()!;
    isPlayingRef.current = true;
    setIsPlayingAudio(true);

    const audio = new Audio(`data:${item.mimeType};base64,${item.audioBase64}`);
    audio.onended = () => {
      playNextInQueue();
    };
    audio.onerror = () => {
      playNextInQueue();
    };
    audio.play().catch(() => {
      playNextInQueue();
    });
  }, []);

  const queueAudioForPlayback = useCallback(
    (audioBase64: string, mimeType = 'audio/wav') => {
      audioQueueRef.current.push({ audioBase64, mimeType });
      if (!isPlayingRef.current) {
        playNextInQueue();
      }
    },
    [playNextInQueue]
  );

  // Play a single utterance on demand (e.g. "Listen Again" or "Explain Simply")
  const playAudioDirectly = useCallback((audioBase64: string, mimeType = 'audio/wav') => {
    const audio = new Audio(`data:${mimeType};base64,${audioBase64}`);
    isPlayingRef.current = true;
    setIsPlayingAudio(true);
    audio.onended = () => {
      isPlayingRef.current = false;
      setIsPlayingAudio(false);
    };
    audio.play().catch(() => {
      isPlayingRef.current = false;
      setIsPlayingAudio(false);
    });
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    hasPermission,
    permissionError,
    isMuted,
    isSpeaking,
    micLevel,
    isPlayingAudio,
    initializeMic,
    toggleMute,
    queueAudioForPlayback,
    playAudioDirectly,
  };
}
