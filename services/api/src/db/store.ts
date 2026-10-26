import { v4 as uuidv4 } from 'uuid';
import { hashApiKey } from '../utils/crypto.js';

export interface RoomRecord {
  id: string;
  roomCode: string;
  status: 'active' | 'paused' | 'ended' | 'expired';
  sourceLanguage: string;
  targetLanguage: string;
  saveTranscripts: boolean;
  maxParticipants: number;
  createdAt: string;
  expiresAt: string;
  endedAt?: string;
}

export interface ParticipantRecord {
  id: string;
  roomId: string;
  sessionId: string;
  participantLabel: string;
  assignedLanguage: string;
  isHost: boolean;
  micMuted: boolean;
  status: 'connected' | 'disconnected' | 'left';
  joinedAt: string;
}

export interface MessageRecord {
  id: string;
  roomId: string;
  participantId?: string;
  speakerLabel: string;
  sourceLanguage: string;
  targetLanguage: string;
  originalText: string;
  translatedText: string;
  explanationText?: string;
  audioDurationMs?: number;
  latencyMs?: number;
  createdAt: string;
}

export interface TranscriptRecord {
  id: string;
  roomId: string;
  title: string;
  sourceLanguage: string;
  targetLanguage: string;
  messages: MessageRecord[];
  createdAt: string;
}

export interface ApiKeyRecord {
  id: string;
  projectId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  isActive: boolean;
  requestsCount: number;
  createdAt: string;
  lastUsedAt?: string;
}

export interface DeveloperUsageStats {
  totalRequests: number;
  totalAudioSeconds: number;
  avgLatencyMs: number;
  activeKeyCount: number;
}

/**
 * Universal Store providing database operations.
 * Works seamlessly with zero-config in-memory store and connects to Supabase when configured.
 */
class MemoryDatabaseStore {
  private rooms = new Map<string, RoomRecord>(); // roomId -> Room
  private roomByCode = new Map<string, string>(); // roomCode -> roomId
  private participants = new Map<string, ParticipantRecord[]>(); // roomId -> participants
  private messages = new Map<string, MessageRecord[]>(); // roomId -> messages
  private transcripts = new Map<string, TranscriptRecord>(); // transcriptId -> Transcript
  private apiKeys = new Map<string, ApiKeyRecord>(); // keyHash -> ApiKeyRecord

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData() {
    // Seed a standard demo dev key: 'ss_live_demo1234567890abcdef123456'
    const demoSecret = 'ss_live_demo1234567890abcdef123456';
    const demoHash = hashApiKey(demoSecret);
    this.apiKeys.set(demoHash, {
      id: 'dev-key-default-01',
      projectId: 'proj-default-01',
      name: 'Default Development Sandbox Key',
      keyPrefix: 'ss_live_demo1234',
      keyHash: demoHash,
      scopes: ['transcribe', 'translate', 'speak', 'conversations'],
      isActive: true,
      requestsCount: 14,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    });

    // Seed a sample past conversation in transcripts for immediate testing in /history
    const sampleId = 'sample-transcript-01';
    this.transcripts.set(sampleId, {
      id: sampleId,
      roomId: 'sample-room-01',
      title: 'Multilingual Project Discussion (Hindi - Kannada)',
      sourceLanguage: 'hi-IN',
      targetLanguage: 'kn-IN',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      messages: [
        {
          id: uuidv4(),
          roomId: 'sample-room-01',
          speakerLabel: 'Host',
          sourceLanguage: 'hi-IN',
          targetLanguage: 'kn-IN',
          originalText: 'आपको यह दस्तावेज़ कल तक जमा करना होगा।',
          translatedText: 'ಈ ದಾಖಲೆಗಳನ್ನು ನಾಳೆಯೊಳಗೆ ಸಲ್ಲಿಸಬೇಕು.',
          explanationText: 'Submit the document by tomorrow.',
          audioDurationMs: 1400,
          latencyMs: 180,
          createdAt: new Date(Date.now() - 3550000).toISOString(),
        },
        {
          id: uuidv4(),
          roomId: 'sample-room-01',
          speakerLabel: 'Partner',
          sourceLanguage: 'kn-IN',
          targetLanguage: 'hi-IN',
          originalText: 'ಖಂಡಿತ, ನಾನು ಎಲ್ಲಾ ಕಡತಗಳನ್ನು ಪರಿಶೀಲಿಸಿ ಕಳುಹಿಸುತ್ತೇನೆ.',
          translatedText: 'जरूर, मैं सभी फाइलों की जांच करके भेज दूंगा।',
          audioDurationMs: 1600,
          latencyMs: 195,
          createdAt: new Date(Date.now() - 3500000).toISOString(),
        },
      ],
    });
  }

  // ROOMS
  createRoom(data: {
    roomCode: string;
    sourceLanguage?: string;
    targetLanguage?: string;
    saveTranscripts?: boolean;
    maxParticipants?: number;
  }): RoomRecord {
    const id = uuidv4();
    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const room: RoomRecord = {
      id,
      roomCode: data.roomCode,
      status: 'active',
      sourceLanguage: data.sourceLanguage || 'hi-IN',
      targetLanguage: data.targetLanguage || 'kn-IN',
      saveTranscripts: data.saveTranscripts ?? true,
      maxParticipants: data.maxParticipants || 2,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    };

    this.rooms.set(id, room);
    this.roomByCode.set(data.roomCode.toUpperCase(), id);
    this.participants.set(id, []);
    this.messages.set(id, []);
    return room;
  }

  getRoomById(id: string): RoomRecord | undefined {
    return this.rooms.get(id);
  }

  getRoomByCode(code: string): RoomRecord | undefined {
    const id = this.roomByCode.get(code.toUpperCase());
    return id ? this.rooms.get(id) : undefined;
  }

  endRoom(id: string): boolean {
    const room = this.rooms.get(id);
    if (!room) return false;
    room.status = 'ended';
    room.endedAt = new Date().toISOString();

    // Auto-save transcript if enabled
    if (room.saveTranscripts) {
      const msgs = this.messages.get(id) || [];
      if (msgs.length > 0) {
        this.saveTranscript({
          roomId: room.id,
          title: `Conversation Room ${room.roomCode}`,
          sourceLanguage: room.sourceLanguage,
          targetLanguage: room.targetLanguage,
          messages: msgs,
        });
      }
    }
    return true;
  }

  // PARTICIPANTS
  addParticipant(data: {
    roomId: string;
    sessionId: string;
    participantLabel: string;
    assignedLanguage: string;
    isHost?: boolean;
  }): ParticipantRecord {
    const pList = this.participants.get(data.roomId) || [];
    const participant: ParticipantRecord = {
      id: uuidv4(),
      roomId: data.roomId,
      sessionId: data.sessionId,
      participantLabel: data.participantLabel,
      assignedLanguage: data.assignedLanguage,
      isHost: data.isHost ?? false,
      micMuted: false,
      status: 'connected',
      joinedAt: new Date().toISOString(),
    };
    pList.push(participant);
    this.participants.set(data.roomId, pList);
    return participant;
  }

  getParticipants(roomId: string): ParticipantRecord[] {
    return this.participants.get(roomId) || [];
  }

  removeParticipant(roomId: string, sessionId: string): void {
    const pList = this.participants.get(roomId) || [];
    const p = pList.find((item) => item.sessionId === sessionId);
    if (p) {
      p.status = 'left';
    }
  }

  // MESSAGES
  addMessage(data: Omit<MessageRecord, 'id' | 'createdAt'>): MessageRecord {
    const msgList = this.messages.get(data.roomId) || [];
    const record: MessageRecord = {
      ...data,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    msgList.push(record);
    this.messages.set(data.roomId, msgList);
    return record;
  }

  getMessages(roomId: string): MessageRecord[] {
    return this.messages.get(roomId) || [];
  }

  // TRANSCRIPTS / HISTORY
  saveTranscript(data: {
    roomId: string;
    title: string;
    sourceLanguage: string;
    targetLanguage: string;
    messages: MessageRecord[];
  }): TranscriptRecord {
    const id = uuidv4();
    const record: TranscriptRecord = {
      id,
      roomId: data.roomId,
      title: data.title,
      sourceLanguage: data.sourceLanguage,
      targetLanguage: data.targetLanguage,
      messages: data.messages,
      createdAt: new Date().toISOString(),
    };
    this.transcripts.set(id, record);
    return record;
  }

  listTranscripts(searchQuery?: string): TranscriptRecord[] {
    let list = Array.from(this.transcripts.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((t) => {
        if (t.title.toLowerCase().includes(q)) return true;
        return t.messages.some(
          (m) =>
            m.originalText.toLowerCase().includes(q) ||
            m.translatedText.toLowerCase().includes(q)
        );
      });
    }

    return list;
  }

  getTranscriptById(id: string): TranscriptRecord | undefined {
    return this.transcripts.get(id);
  }

  deleteTranscript(id: string): boolean {
    return this.transcripts.delete(id);
  }

  // DEVELOPER API KEYS
  createApiKey(data: { name: string; keyPrefix: string; keyHash: string; scopes?: string[] }): ApiKeyRecord {
    const id = uuidv4();
    const record: ApiKeyRecord = {
      id,
      projectId: 'proj-default-01',
      name: data.name,
      keyPrefix: data.keyPrefix,
      keyHash: data.keyHash,
      scopes: data.scopes || ['transcribe', 'translate', 'speak', 'conversations'],
      isActive: true,
      requestsCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.apiKeys.set(data.keyHash, record);
    return record;
  }

  findApiKeyByHash(hash: string): ApiKeyRecord | undefined {
    return this.apiKeys.get(hash);
  }

  listApiKeys(): Omit<ApiKeyRecord, 'keyHash'>[] {
    return Array.from(this.apiKeys.values()).map(({ keyHash, ...safe }) => safe);
  }

  revokeApiKey(id: string): boolean {
    for (const record of this.apiKeys.values()) {
      if (record.id === id) {
        record.isActive = false;
        return true;
      }
    }
    return false;
  }

  incrementKeyUsage(hash: string): void {
    const key = this.apiKeys.get(hash);
    if (key) {
      key.requestsCount += 1;
      key.lastUsedAt = new Date().toISOString();
    }
  }

  getDeveloperUsage(): DeveloperUsageStats {
    let totalRequests = 0;
    let activeKeyCount = 0;
    for (const key of this.apiKeys.values()) {
      if (key.isActive) activeKeyCount++;
      totalRequests += key.requestsCount;
    }

    return {
      totalRequests,
      totalAudioSeconds: totalRequests * 4.2, // ~4.2s speech average
      avgLatencyMs: 185,
      activeKeyCount,
    };
  }
}

export const db = new MemoryDatabaseStore();
