import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'node:http';
import { v4 as uuidv4 } from 'uuid';
import { SpeechProvider } from '@sunosamjho/gnani';
import { db } from '../db/store.js';

interface ClientSession {
  id: string;
  roomId: string;
  socket: WebSocket;
  participantLabel: string;
  assignedLanguage: string;
  isHost: boolean;
  isAlive: boolean;
}

export class RealtimeHub {
  private rooms = new Map<string, Map<string, ClientSession>>();

  constructor(private wss: WebSocketServer, private provider: SpeechProvider) {
    this.init();
  }

  private init() {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      const pathParts = url.pathname.split('/');
      // Expecting path /api/v1/realtime/:conversationId
      const roomIdOrCode = pathParts[pathParts.length - 1];

      let room = db.getRoomById(roomIdOrCode) || db.getRoomByCode(roomIdOrCode);
      if (!room) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room not found or expired.' }));
        ws.close(4004, 'Room not found');
        return;
      }

      const sessionId = uuidv4();
      const session: ClientSession = {
        id: sessionId,
        roomId: room.id,
        socket: ws,
        participantLabel: 'Guest',
        assignedLanguage: room.sourceLanguage,
        isHost: false,
        isAlive: true,
      };

      if (!this.rooms.has(room.id)) {
        this.rooms.set(room.id, new Map());
      }
      this.rooms.get(room.id)!.set(sessionId, session);

      // Heartbeat handling
      ws.on('pong', () => {
        session.isAlive = true;
      });

      // Message processing
      ws.on('message', async (data: Buffer | string) => {
        try {
          const payload = JSON.parse(data.toString());
          await this.handleMessage(session, payload);
        } catch (err: any) {
          ws.send(JSON.stringify({ type: 'error', message: err.message || 'Malformed message' }));
        }
      });

      // Cleanup on disconnect
      ws.on('close', () => {
        this.handleDisconnect(session);
      });

      // Send initial connection acknowledgment
      ws.send(
        JSON.stringify({
          type: 'connected',
          sessionId,
          roomId: room.id,
          roomCode: room.roomCode,
          isMock: this.provider.isMock,
        })
      );
    });

    // Periodic heartbeat check every 30s
    setInterval(() => {
      for (const clientMap of this.rooms.values()) {
        for (const session of clientMap.values()) {
          if (!session.isAlive) {
            session.socket.terminate();
            continue;
          }
          session.isAlive = false;
          session.socket.ping();
        }
      }
    }, 30000);
  }

  private async handleMessage(session: ClientSession, msg: any) {
    switch (msg.type) {
      case 'join': {
        session.participantLabel = msg.participantLabel || session.participantLabel;
        session.assignedLanguage = msg.assignedLanguage || session.assignedLanguage;
        session.isHost = Boolean(msg.isHost);

        db.addParticipant({
          roomId: session.roomId,
          sessionId: session.id,
          participantLabel: session.participantLabel,
          assignedLanguage: session.assignedLanguage,
          isHost: session.isHost,
        });

        // Broadcast presence
        this.broadcast(session.roomId, {
          type: 'participant_joined',
          participant: {
            id: session.id,
            label: session.participantLabel,
            language: session.assignedLanguage,
            isHost: session.isHost,
          },
        });
        break;
      }

      case 'mic_state': {
        this.broadcast(session.roomId, {
          type: 'participant_mic_changed',
          sessionId: session.id,
          muted: Boolean(msg.muted),
          isSpeaking: Boolean(msg.isSpeaking),
        });
        break;
      }

      case 'audio_frame': {
        // High-performance voice speech chunk from client AudioWorklet / VAD
        const { audioBase64, language } = msg;
        if (!audioBase64) return;

        const speakerLanguage = language || session.assignedLanguage;
        const startTime = Date.now();

        // 1. Notify room that utterance is being processed
        this.broadcast(session.roomId, {
          type: 'speech_status',
          sessionId: session.id,
          status: 'PROCESSING',
        });

        try {
          const audioBuffer = Buffer.from(audioBase64, 'base64');

          // Stage 1: Transcribe using Gnani Prisma
          const requestedOptions = msg.prismaOptions || {};
          const allowedBiasScores = [0.5, 1, 1.5, 2];
          const biasList = Array.isArray(requestedOptions.biasList)
            ? requestedOptions.biasList
                .filter((word: unknown): word is string => typeof word === 'string' && /^[\p{L}]+$/u.test(word.trim()))
                .slice(0, 100)
            : [];
          const requestedBiasScore = Number(requestedOptions.biasScore);
          const useWordBoosting = biasList.length > 0 && allowedBiasScores.includes(requestedBiasScore);
          const sttResult = await this.provider.transcribe(audioBuffer, speakerLanguage, {
            audioFormat: 'wav',
            sampleRate: 16000,
            encoding: 'LINEAR16',
            format: useWordBoosting || requestedOptions.format === 'verbatim' ? 'verbatim' : 'transcribe',
            itnNativeNumerals: !useWordBoosting && Boolean(requestedOptions.itnNativeNumerals),
            biasList: useWordBoosting ? biasList : [],
            biasScore: allowedBiasScores.includes(requestedBiasScore) ? requestedBiasScore as 0.5 | 1 | 1.5 | 2 : 1,
          });
          if (!sttResult.text || !sttResult.text.trim()) {
            this.broadcast(session.roomId, {
              type: 'speech_status',
              sessionId: session.id,
              status: 'LISTENING',
            });
            return;
          }

          // Broadcast recognized original transcript
          this.broadcast(session.roomId, {
            type: 'transcript',
            sessionId: session.id,
            speakerLabel: session.participantLabel,
            sourceLanguage: speakerLanguage,
            text: sttResult.text,
            isFinal: true,
          });

          // Stage 2: Determine target language
          // Find the peer participant's assigned language, or fallback to the room target language
          const peer = this.getOtherParticipant(session.roomId, session.id);
          const targetLang = peer ? peer.assignedLanguage : (speakerLanguage === 'hi-IN' ? 'kn-IN' : 'hi-IN');

          // Stage 3: Translate using Gnani Evon
          this.broadcast(session.roomId, {
            type: 'speech_status',
            sessionId: session.id,
            status: 'TRANSLATING',
          });

          const transResult = await this.provider.translate(sttResult.text, speakerLanguage, targetLang);

          // Stage 4: Synthesize translated speech using Gnani Timbre
          this.broadcast(session.roomId, {
            type: 'speech_status',
            sessionId: session.id,
            status: 'SPEAKING',
          });

          const synthResult = await this.provider.synthesize(transResult.translatedText, targetLang);
          const totalLatency = Date.now() - startTime;

          // Record finalized message in DB
          const record = db.addMessage({
            roomId: session.roomId,
            speakerLabel: session.participantLabel,
            sourceLanguage: speakerLanguage,
            targetLanguage: targetLang,
            originalText: sttResult.text,
            translatedText: transResult.translatedText,
            audioDurationMs: synthResult.durationMs,
            latencyMs: totalLatency,
          });

          // Broadcast completed translation & audio packet
          this.broadcast(session.roomId, {
            type: 'translation_complete',
            messageId: record.id,
            sessionId: session.id,
            speakerLabel: session.participantLabel,
            sourceLanguage: speakerLanguage,
            targetLanguage: targetLang,
            originalText: sttResult.text,
            translatedText: transResult.translatedText,
            audioBase64: synthResult.audioBase64,
            mimeType: synthResult.mimeType,
            latencyMs: totalLatency,
            timestamp: record.createdAt,
          });

          // Return to listening
          this.broadcast(session.roomId, {
            type: 'speech_status',
            sessionId: session.id,
            status: 'LISTENING',
          });
        } catch (error: any) {
          this.broadcast(session.roomId, {
            type: 'speech_status',
            sessionId: session.id,
            status: 'ERROR',
            errorMessage: error.message || 'Voice pipeline processing failed',
          });
        }
        break;
      }

      case 'explain': {
        const { text, language } = msg;
        const explainResult = await this.provider.explain(text, language || session.assignedLanguage);
        session.socket.send(
          JSON.stringify({
            type: 'explanation_ready',
            originalText: text,
            explanation: explainResult.explanation,
            audioBase64: explainResult.listenAudioBase64,
          })
        );
        break;
      }
    }
  }

  private handleDisconnect(session: ClientSession) {
    db.removeParticipant(session.roomId, session.id);
    const roomSessions = this.rooms.get(session.roomId);
    if (roomSessions) {
      roomSessions.delete(session.id);
      if (roomSessions.size === 0) {
        this.rooms.delete(session.roomId);
      } else {
        this.broadcast(session.roomId, {
          type: 'participant_left',
          sessionId: session.id,
          label: session.participantLabel,
        });
      }
    }
  }

  private getOtherParticipant(roomId: string, currentSessionId: string): ClientSession | undefined {
    const roomSessions = this.rooms.get(roomId);
    if (!roomSessions) return undefined;
    for (const [id, s] of roomSessions) {
      if (id !== currentSessionId) return s;
    }
    return undefined;
  }

  private broadcast(roomId: string, payload: any) {
    const roomSessions = this.rooms.get(roomId);
    if (!roomSessions) return;
    const data = JSON.stringify(payload);
    for (const session of roomSessions.values()) {
      if (session.socket.readyState === WebSocket.OPEN) {
        session.socket.send(data);
      }
    }
  }
}
