import type { ChatMessage } from '../lib/llm';
import type { Player, Side } from '../engine/types';

export function personaBlock(me: Player): string {
  return me.persona.trim() ? `\n\nYour persona (affects only your table talk, never the rules): ${me.persona.trim()}` : '';
}

export const TABLE_TALK =
  'You may write ONE short sentence of table talk aimed at your opponent first (optional). ' +
  'Your reply MUST end with a final line in exactly this form:';

/** The value after the last "MOVE:" marker, if any. */
export function markedMove(answer: string): string | null {
  const matches = [...answer.matchAll(/\bmove\s*[:=]\s*[*_`"']*\s*([^\s*_`"',;)]+)/gi)];
  if (!matches.length) return null;
  return matches[matches.length - 1][1].trim();
}

export function pickRandom<T>(items: T[]): T | undefined {
  return items[Math.floor(Math.random() * items.length)];
}

/** Merge consecutive same-role messages; many local chat templates require strict alternation. */
export function alternate(messages: ChatMessage[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const m of messages) {
    const prev = out[out.length - 1];
    if (prev && prev.role === m.role && m.role !== 'system') prev.content += `\n\n${m.content}`;
    else out.push({ ...m });
  }
  return out;
}

export const otherSide = (s: Side): Side => (1 - s) as Side;
