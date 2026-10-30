import type { ChatMessage } from '../lib/llm';
import type { GameDef, Player, Side } from '../engine/types';
import { alternate, personaBlock } from './common';

export interface ConversationSetup {
  format: 'chat' | 'debate';
  topic: string;
  motion: string;
  turns: number;
  maxWords: number;
  judge: boolean;
  /** Which player's server and model the judge uses. */
  judgeSide: Side;
  /** Optional model id override for the judge (same server). */
  judgeModel: string;
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

export function debateStage(turn: number, turns: number): string {
  if (turn < 2) return 'Opening statement';
  if (turn >= turns - 2) return 'Closing statement';
  return 'Rebuttal';
}

function systemFor(setup: ConversationSetup, state: ConversationState, side: Side, me: Player, opponent: Player): string {
  const limit = `Reply in at most ${setup.maxWords} words. Do not prefix your reply with your name. If a [Moderator] message appears, address it.`;
  if (setup.format === 'debate') {
    const stance = side === 0 ? 'FOR' : 'AGAINST';
    const stage = debateStage(state.turn, setup.turns);
    return (
      `You are ${me.name}, in a formal debate against ${opponent.name}, another AI.\n` +
      `Motion: "${setup.motion}"\nYou argue ${stance} the motion. Stay on your side even if you privately disagree.\n` +
      `Current stage: ${stage}. ` +
      (stage === 'Opening statement'
        ? 'Lay out your strongest two or three arguments.'
        : stage === 'Rebuttal'
          ? "Directly answer your opponent's latest points, then strengthen your case."
          : 'Summarise why your side has won the debate. Do not introduce new arguments.') +
      `\n${limit}` +
      personaBlock(me)
    );
  }
  return (
    `You are ${me.name}, having a conversation with ${opponent.name}, another AI.\nTopic: ${setup.topic}\n` +
    `Reply conversationally. Build on what was said, ask questions, disagree when you genuinely do. ${limit}` +
    personaBlock(me)
  );
}

export const conversationGame: GameDef<ConversationState, ConversationSetup> = {
  id: 'conversation',
  name: 'Conversation',
  tagline: 'An open chat or a formal debate, optionally judged.',
  kind: 'text',
  sideLabels: (setup) => (setup.format === 'debate' ? ['For', 'Against'] : ['Speaker A', 'Speaker B']),
  defaultSetup: {
    format: 'chat',
    topic: 'If you could redesign one everyday object from scratch, what would it be and why?',
    motion: 'This house believes that remote work is better than working in an office.',
    turns: 8,
    maxWords: 120,
    judge: true,
    judgeSide: 0,
    judgeModel: '',
  },

  create: () => ({ messages: [], turn: 0 }),
  currentSide: (s) => (s.turn % 2) as Side,

  buildMessages(state, { setup, side, me, opponent }) {
    const subject = setup.format === 'debate' ? `the motion "${setup.motion}"` : setup.topic;
    const opener = state.messages.length === 0 ? `Please open the ${setup.format === 'debate' ? 'debate' : 'conversation'} on ${subject}.` : `We are discussing ${subject}.`;
    return alternate([{ role: 'system', content: systemFor(setup, state, side, me, opponent) }, ...transcriptFor(state.messages, side, opener)]);
  },

  apply(state, side, answer) {
    const text = answer.trim();
    if (!text) return { ok: false, reason: 'the reply was empty' };
    return { ok: true, state: { messages: [...state.messages, { side, text }], turn: state.turn + 1 }, label: '' };
  },

  inject: (state, note) => ({ ...state, messages: [...state.messages, { side: null, text: note }] }),

  result(state, setup) {
    if (state.turn < setup.turns) return null;
    return { winner: null, summary: setup.format === 'debate' ? 'The debate is over.' : `Conversation finished after ${state.turn} turns.` };
  },

  verdict(state, setup, players) {
    if (setup.format !== 'debate' || !setup.judge) return null;
    const base = players[setup.judgeSide];
    const judge: Player = { ...base, name: 'Judge', persona: '', model: setup.judgeModel.trim() || base.model, temperature: 0.2 };
    const transcript = state.messages
      .map((m) => (m.side === null ? `MODERATOR: ${m.text}` : `${m.side === 0 ? 'A (For)' : 'B (Against)'}: ${m.text}`))
      .join('\n\n');
    return {
      judge,
      messages: [
        {
          role: 'system',
          content:
            'You are an impartial debate judge. Judge only the quality of argument, rebuttal and persuasion in the transcript — not your own opinion on the motion. ' +
            'Write a short verdict (under 120 words) explaining the decisive points, then end with a final line exactly in the form: WINNER: A, WINNER: B or WINNER: TIE',
        },
        { role: 'user', content: `Motion: "${setup.motion}"\nA = ${players[0].name} (For), B = ${players[1].name} (Against)\n\nTranscript:\n\n${transcript}` },
      ],
      parse(answer) {
        const m = [...answer.matchAll(/winner\s*[:=]\s*\**\s*(A|B|TIE)\b/gi)].pop()?.[1]?.toUpperCase();
        if (m === 'A') return { winner: 0, summary: `The judge awards the debate to ${players[0].name} (For).` };
        if (m === 'B') return { winner: 1, summary: `The judge awards the debate to ${players[1].name} (Against).` };
        return { winner: null, summary: m === 'TIE' ? 'The judge declares a tie.' : 'The judge did not name a winner.' };
      },
    };
  },

  status(state, setup) {
    const n = Math.min(state.turn + 1, setup.turns);
    return setup.format === 'debate' ? `${debateStage(state.turn, setup.turns)} · turn ${n} of ${setup.turns}` : `Turn ${n} of ${setup.turns}`;
  },
};
