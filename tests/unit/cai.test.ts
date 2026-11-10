// tests/unit/cai.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateCaiRequestId,
  createCaiTurnPayload,
  createCaiGreetingPayload,
  extractCaiContext,
  aggregateCaiTurns,
} from '../../src/shared/cai-protocol.js';
import { StreamEvent } from '../../src/shared/types.js';

test('generateCaiRequestId: generates valid request_id with characterId suffix', () => {
  const charId = 'w3tOOWtQQqtENJ3NH3elZsylKg6S8gpm6e6oQVrhVnU';
  const reqId = generateCaiRequestId(charId);

  assert.equal(reqId.endsWith('m6e6oQVrhVnU'), true);
  assert.equal(reqId.length, 37); // 24 prefix + 1 dash + 12 suffix
});

test('createCaiTurnPayload: constructs accurate Character.AI turn payload with fresh UUIDs', () => {
  const payload = createCaiTurnPayload({
    chatId: 'd517aa25-348e-47ab-9059-67028be75d42',
    characterId: 'w3tOOWtQQqtENJ3NH3elZsylKg6S8gpm6e6oQVrhVnU',
    userName: 'HurtHyena2323',
    userAuthorId: '997886988',
    messageText: 'yeah.. you are right',
  });

  assert.equal(payload.command, 'create_and_generate_turn');
  assert.equal(payload.origin_id, 'web-next');
  assert.equal(payload.payload.character_id, 'w3tOOWtQQqtENJ3NH3elZsylKg6S8gpm6e6oQVrhVnU');
  assert.equal(payload.payload.user_name, 'HurtHyena2323');
  assert.equal(payload.payload.turn.turn_key.chat_id, 'd517aa25-348e-47ab-9059-67028be75d42');
  assert.equal(payload.payload.turn.candidates[0].raw_content, 'yeah.. you are right');
  assert.equal(payload.payload.turn.primary_candidate_id, payload.payload.turn.candidates[0].candidate_id);
  assert.equal(payload.payload.previous_annotations.boring, 0);
});

test('extractCaiContext: extracts chat_id and character details from server stream events', () => {
  const events: StreamEvent[] = [
    {
      sessionId: 'sess-1',
      protocol: 'WEBSOCKET',
      direction: 'IN',
      type: 'message',
      timestamp: 1000,
      payload: JSON.stringify({
        command: 'update_turn',
        request_id: 'e9bff0b6-e0c0-47ab-b2b3-m6e6oQVrhVnU',
        turn: {
          turn_key: {
            chat_id: 'd517aa25-348e-47ab-9059-67028be75d42',
            turn_id: 'fa20659a-537b-4ca2-b717-e6bb9b3eab4f',
          },
          author: {
            author_id: 'w3tOOWtQQqtENJ3NH3elZsylKg6S8gpm6e6oQVrhVnU',
            name: 'kim hyejin',
            is_human: false,
          },
          candidates: [
            {
              candidate_id: 'chatcmpl-043264d77d85cb0d0bbb823f02276673',
              raw_content: '*laughing softly*',
              is_final: false,
            },
          ],
        },
      }),
    },
  ];

  const ctx = extractCaiContext(events);
  assert.equal(ctx.chatId, 'd517aa25-348e-47ab-9059-67028be75d42');
  assert.equal(ctx.characterId, 'w3tOOWtQQqtENJ3NH3elZsylKg6S8gpm6e6oQVrhVnU');
  assert.equal(ctx.characterName, 'kim hyejin');
});

test('aggregateCaiTurns: consolidates streaming token chunks into a single message bubble', () => {
  const events: StreamEvent[] = [
    {
      sessionId: 'sess-1',
      protocol: 'WEBSOCKET',
      direction: 'IN',
      type: 'message',
      timestamp: 1000,
      payload: {
        command: 'update_turn',
        turn: {
          turn_key: {
            turn_id: 'turn-999',
            chat_id: 'chat-111',
          },
          author: { name: 'kim hyejin' },
          candidates: [{ raw_content: '*laughing', is_final: false }],
        },
      },
    },
    {
      sessionId: 'sess-1',
      protocol: 'WEBSOCKET',
      direction: 'IN',
      type: 'message',
      timestamp: 1005,
      payload: {
        command: 'update_turn',
        turn: {
          turn_key: {
            turn_id: 'turn-999',
            chat_id: 'chat-111',
          },
          author: { name: 'kim hyejin' },
          candidates: [{ raw_content: '*laughing softly*', is_final: false }],
        },
      },
    },
    {
      sessionId: 'sess-1',
      protocol: 'WEBSOCKET',
      direction: 'IN',
      type: 'message',
      timestamp: 1010,
      payload: {
        command: 'update_turn',
        turn: {
          turn_key: {
            turn_id: 'turn-999',
            chat_id: 'chat-111',
          },
          author: { name: 'kim hyejin' },
          candidates: [{ raw_content: '*laughing softly, I toss a towel*', is_final: true }],
        },
      },
    },
  ];

  const aggregated = aggregateCaiTurns(events);
  assert.equal(aggregated.length, 1);
  assert.equal(aggregated[0].rawContent, '*laughing softly, I toss a towel*');
  assert.equal(aggregated[0].isFinal, true);
  assert.equal(aggregated[0].chunkCount, 3);
  assert.equal(aggregated[0].authorName, 'kim hyejin');
});
