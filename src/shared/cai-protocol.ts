// src/shared/cai-protocol.ts
import { StreamEvent } from './types.js';

export function getRandomUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generates Character.AI specific request_id:
 * e.g. "6eb08fa4-341d-457a-8f1d-m6e6oQVrhVnU"
 * (24 chars UUID prefix + "-" + last 12 chars of characterId)
 */
export function generateCaiRequestId(characterId?: string): string {
  const uuid = getRandomUuid();
  if (characterId && characterId.trim().length >= 8) {
    const cleanChar = characterId.trim();
    const suffix = cleanChar.slice(-12);
    return `${uuid.slice(0, 24)}-${suffix}`;
  }
  return uuid;
}

export interface CaiTurnParams {
  chatId: string;
  characterId: string;
  userName?: string;
  userAuthorId?: string;
  messageText: string;
}

export interface CaiTurnPayload {
  command: 'create_and_generate_turn';
  request_id: string;
  payload: {
    chat_type: string;
    num_candidates: number;
    tts_enabled: boolean;
    selected_language: string;
    character_id: string;
    user_name: string;
    turn: {
      turn_key: {
        turn_id: string;
        chat_id: string;
      };
      author: {
        author_id: string;
        is_human: boolean;
        name: string;
      };
      candidates: Array<{
        candidate_id: string;
        raw_content: string;
      }>;
      primary_candidate_id: string;
    };
    previous_annotations: Record<string, number>;
    generate_comparison: boolean;
  };
  origin_id: string;
}

/**
 * Builds the complete create_and_generate_turn payload with auto-generated UUIDs
 */
export function createCaiTurnPayload(params: CaiTurnParams): CaiTurnPayload {
  const candidateId = getRandomUuid();
  const turnId = getRandomUuid();
  const requestId = generateCaiRequestId(params.characterId);
  const userName = (params.userName || 'HurtHyena2323').trim();
  const authorId = (params.userAuthorId || '997886988').trim();

  return {
    command: 'create_and_generate_turn',
    request_id: requestId,
    payload: {
      chat_type: 'TYPE_ONE_ON_ONE',
      num_candidates: 1,
      tts_enabled: false,
      selected_language: '',
      character_id: params.characterId.trim(),
      user_name: userName,
      turn: {
        turn_key: {
          turn_id: turnId,
          chat_id: params.chatId.trim(),
        },
        author: {
          author_id: authorId,
          is_human: true,
          name: userName,
        },
        candidates: [
          {
            candidate_id: candidateId,
            raw_content: params.messageText,
          },
        ],
        primary_candidate_id: candidateId,
      },
      previous_annotations: {
        boring: 0,
        not_boring: 0,
        inaccurate: 0,
        not_inaccurate: 0,
        repetitive: 0,
        not_repetitive: 0,
        out_of_character: 0,
        not_out_of_character: 0,
        bad_memory: 0,
        not_bad_memory: 0,
        long: 0,
        not_long: 0,
        short: 0,
        not_short: 0,
        ends_chat_early: 0,
        not_ends_chat_early: 0,
        funny: 0,
        not_funny: 0,
        interesting: 0,
        not_interesting: 0,
        helpful: 0,
        not_helpful: 0,
      },
      generate_comparison: false,
    },
    origin_id: 'web-next',
  };
}

/**
 * Builds generate_greeting payload to initialize character greeting
 */
export function createCaiGreetingPayload(chatId: string, characterId: string, userName?: string) {
  return {
    command: 'generate_greeting',
    request_id: generateCaiRequestId(characterId),
    payload: {
      chat_type: 'TYPE_ONE_ON_ONE',
      character_id: characterId.trim(),
      user_name: (userName || 'HurtHyena2323').trim(),
      turn_key: {
        chat_id: chatId.trim(),
      },
    },
    origin_id: 'web-next',
  };
}

export interface CaiExtractedContext {
  chatId?: string;
  characterId?: string;
  characterName?: string;
  userName?: string;
  userAuthorId?: string;
}

/**
 * Automatically extracts the active chat_id, character_id, and names
 * by inspecting recorded stream events (from server or outgoing turns)
 */
export function extractCaiContext(events: StreamEvent[]): CaiExtractedContext {
  const result: CaiExtractedContext = {};

  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    let data: any = null;
    if (typeof ev.payload === 'object' && ev.payload !== null) {
      data = ev.payload;
    } else if (typeof ev.payload === 'string' && ev.payload.startsWith('{')) {
      try {
        data = JSON.parse(ev.payload);
      } catch {
        continue;
      }
    }

    if (!data) continue;

    // 1. Check turn.turn_key
    if (!result.chatId && data.turn?.turn_key?.chat_id) {
      result.chatId = data.turn.turn_key.chat_id;
    }
    if (!result.chatId && data.payload?.turn?.turn_key?.chat_id) {
      result.chatId = data.payload.turn.turn_key.chat_id;
    }
    if (!result.chatId && data.payload?.turn_key?.chat_id) {
      result.chatId = data.payload.turn_key.chat_id;
    }

    // 2. Check author
    if (data.turn?.author) {
      const author = data.turn.author;
      if (!author.is_human) {
        if (!result.characterId && author.author_id) {
          result.characterId = author.author_id;
        }
        if (!result.characterName && author.name) {
          result.characterName = author.name;
        }
      } else {
        if (!result.userName && author.name) {
          result.userName = author.name;
        }
        if (!result.userAuthorId && author.author_id) {
          result.userAuthorId = author.author_id;
        }
      }
    }

    // 3. Check outgoing payload
    if (!result.characterId && data.payload?.character_id) {
      result.characterId = data.payload.character_id;
    }
    if (!result.userName && data.payload?.user_name) {
      result.userName = data.payload.user_name;
    }
    if (!result.userAuthorId && data.payload?.turn?.author?.author_id) {
      result.userAuthorId = data.payload.turn.author.author_id;
    }
  }

  return result;
}

export interface CaiAggregatedMessage {
  id: string; // turn_id or candidate_id
  turnId?: string;
  chatId?: string;
  requestId?: string;
  sender: 'user' | 'bot' | 'system';
  authorName: string;
  authorId?: string;
  rawContent: string;
  timestamp: number;
  isFinal: boolean;
  modelType?: string;
  contextUsage?: number;
  rawJson?: any;
  chunkCount: number;
}

/**
 * Aggregates streaming chunks so that multiple update_turn frames
 * for the same turn are unified into a single live-updating message bubble.
 */
export function aggregateCaiTurns(events: StreamEvent[]): CaiAggregatedMessage[] {
  const messages: CaiAggregatedMessage[] = [];
  const turnMap = new Map<string, CaiAggregatedMessage>();

  for (const ev of events) {
    let data: any = null;
    if (typeof ev.payload === 'object' && ev.payload !== null) {
      data = ev.payload;
    } else if (typeof ev.payload === 'string' && ev.payload.trim().startsWith('{')) {
      try {
        data = JSON.parse(ev.payload);
      } catch {
        // Not a JSON frame, handle as system if direction is SYSTEM
        if (ev.direction === 'SYSTEM') {
          messages.push({
            id: `sys-${ev.timestamp}-${Math.random()}`,
            sender: 'system',
            authorName: 'System',
            rawContent: String(ev.payload),
            timestamp: ev.timestamp,
            isFinal: true,
            chunkCount: 1,
          });
        }
        continue;
      }
    } else {
      if (ev.direction === 'SYSTEM') {
        messages.push({
          id: `sys-${ev.timestamp}-${Math.random()}`,
          sender: 'system',
          authorName: 'System',
          rawContent: String(ev.payload),
          timestamp: ev.timestamp,
          isFinal: true,
          chunkCount: 1,
        });
      }
      continue;
    }

    if (!data) continue;

    // Outgoing user turn
    if (ev.direction === 'OUT') {
      if (data.command === 'create_and_generate_turn') {
        const turnObj = data.payload?.turn;
        const turnId = turnObj?.turn_key?.turn_id || data.request_id || `out-${ev.timestamp}`;
        const candidate = turnObj?.candidates?.[0];
        const content = candidate?.raw_content || '';
        const authorName = data.payload?.user_name || turnObj?.author?.name || 'User';

        const userMsg: CaiAggregatedMessage = {
          id: turnId,
          turnId,
          chatId: turnObj?.turn_key?.chat_id,
          requestId: data.request_id,
          sender: 'user',
          authorName,
          authorId: turnObj?.author?.author_id,
          rawContent: content,
          timestamp: ev.timestamp,
          isFinal: true,
          rawJson: data,
          chunkCount: 1,
        };
        turnMap.set(turnId, userMsg);
        messages.push(userMsg);
        continue;
      } else if (data.command === 'generate_greeting') {
        const sysMsg: CaiAggregatedMessage = {
          id: `greeting-req-${ev.timestamp}`,
          sender: 'system',
          authorName: 'System',
          rawContent: 'Requested initial character greeting...',
          timestamp: ev.timestamp,
          isFinal: true,
          rawJson: data,
          chunkCount: 1,
        };
        messages.push(sysMsg);
        continue;
      }
    }

    // Incoming server turn (Streaming)
    if (ev.direction === 'IN') {
      if (data.command === 'update_turn' && data.turn) {
        const turnKey = data.turn.turn_key;
        const turnId = turnKey?.turn_id;
        const candidate = data.turn.candidates?.[0];
        const candidateId = candidate?.candidate_id || data.turn.primary_candidate_id;
        const mapKey = turnId || candidateId || data.request_id;

        if (mapKey && turnMap.has(mapKey)) {
          // Update existing streaming bubble in place
          const existing = turnMap.get(mapKey)!;
          if (candidate?.raw_content !== undefined) {
            existing.rawContent = candidate.raw_content;
          }
          existing.isFinal = Boolean(candidate?.is_final);
          existing.timestamp = ev.timestamp;
          if (candidate?.model_type) existing.modelType = candidate.model_type;
          if (data.context_stats?.context_usage_stats?.[0]?.usage) {
            existing.contextUsage = data.context_stats.context_usage_stats[0].usage;
          }
          existing.rawJson = data;
          existing.chunkCount += 1;
        } else if (mapKey) {
          // New bot turn
          const authorName = data.turn.author?.name || 'Character';
          const newBotMsg: CaiAggregatedMessage = {
            id: mapKey,
            turnId,
            chatId: turnKey?.chat_id,
            requestId: data.request_id,
            sender: 'bot',
            authorName,
            authorId: data.turn.author?.author_id,
            rawContent: candidate?.raw_content || '',
            timestamp: ev.timestamp,
            isFinal: Boolean(candidate?.is_final),
            modelType: candidate?.model_type,
            contextUsage: data.context_stats?.context_usage_stats?.[0]?.usage,
            rawJson: data,
            chunkCount: 1,
          };
          turnMap.set(mapKey, newBotMsg);
          messages.push(newBotMsg);
        }
        continue;
      }

      // Ignore silent ping / keepalive ok responses in chat view unless error
      if (data.command === 'ok' || data.text === 'ok') {
        continue;
      }
    }
  }

  return messages;
}
