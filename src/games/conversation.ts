import type { ChatMessage } from '../lib/llm';
import type { GameDef, Side } from '../engine/types';
import { alternate, personaBlock } from './common';

export interface ConversationSetup {
  topic: string;
  turns: number;
  maxWords: number;
}

export interface Utterance {
  /** null = moderator. */
  side: Side | null;
  text: string;
}

export interface ConversationState {
  messages: Utterance[];
  turn: number;
}

export function transcriptFor(messages: Utterance[], side: Side, opener: string, limit = 16): ChatMessage[] {
  const recent = messages.slice(-limit);
  const out: ChatMessage[] = [{ role: 'user', content: opener }];
  for (const m of recent) {
    if (m.side === null) out.push({ role: 'user', content: `[Moderator]: ${m.text}` });
    else out.push({ role: m.side === side ? 'assistant' : 'user', content: m.text });
  }
  return out;
}

export const conversationGame: GameDef<ConversationState, ConversationSetup> = {
  id: 'conversation',
  name: 'Conversation',
  tagline: 'An open-ended chat between two models.',
  kind: 'text',
  sideLabels: () => ['Speaker A', 'Speaker B'],
  defaultSetup: {
    topic: 'If you could redesign one everyday object from scratch, what would it be and why?',
    turns: 10,
    maxWords: 120,
  },

  create: () => ({ messages: [], turn: 0 }),
  currentSide: (s) => (s.turn % 2) as Side,

  buildMessages(state, { setup, side, me, opponent }) {
    const system =
      `You are ${me.name}, having a conversation with ${opponent.name}, another AI. ` +
      `Topic: ${setup.topic}\n` +
      `Reply conversationally in at most ${setup.maxWords} words. Build on what was said, ask questions, disagree when you genuinely do. ` +
      'Do not prefix your reply with your name. If a [Moderator] message appears, take it into account.' +
      personaBlock(me);
    const opener = state.messages.length === 0 ? `Please open the conversation about: ${setup.topic}` : `Topic: ${setup.topic}`;
    return alternate([{ role: 'system', content: system }, ...transcriptFor(state.messages, side, opener)]);
  },

  apply(state, side, answer) {
    const text = answer.trim();
    if (!text) return { ok: false, reason: 'the reply was empty' };
    return { ok: true, state: { messages: [...state.messages, { side, text }], turn: state.turn + 1 }, label: '' };
  },

  inject: (state, note) => ({ ...state, messages: [...state.messages, { side: null, text: note }] }),

  result(state, setup) {
    if (state.turn >= setup.turns) return { winner: null, summary: `Conversation finished after ${state.turn} turns.` };
    return null;
  },

  status: (state, setup) => `Turn ${Math.min(state.turn + 1, setup.turns)} of ${setup.turns}`,
};
