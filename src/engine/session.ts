// The turn loop shared by every game. One session runs at a time; starting a
// new one or stopping aborts everything belonging to the previous one.

import { batch, signal } from '@preact/signals';
import { chat, isAbort, sleep, splitThinking, type ChatResult } from '../lib/llm';
import type { AnyGame, GameResult, Player, Side } from './types';

export type Status = 'idle' | 'running' | 'paused' | 'error' | 'finished' | 'stopped';

export interface FeedEntry {
  id: number;
  /** null = system notice. */
  side: Side | null;
  kind: 'turn' | 'system' | 'note' | 'verdict';
  text: string;
  reasoning: string;
  label?: string;
  invalid?: string;
  streaming?: boolean;
  ms?: number;
  tokens?: number;
}

export interface PlayerStats {
  turns: number;
  invalid: number;
  promptTokens: number;
  completionTokens: number;
  estimated: boolean;
  totalMs: number;
}

const emptyStats = (): PlayerStats => ({ turns: 0, invalid: 0, promptTokens: 0, completionTokens: 0, estimated: false, totalMs: 0 });

const MAX_ATTEMPTS = 3;

export const status = signal<Status>('idle');
export const errorMessage = signal<string | null>(null);
export const gameState = signal<any>(null);
/** Id of the game that `gameState` belongs to. */
export const stateGame = signal<string | null>(null);
export const feed = signal<FeedEntry[]>([]);
export const stats = signal<[PlayerStats, PlayerStats]>([emptyStats(), emptyStats()]);
export const result = signal<GameResult | null>(null);
export const thinkingSide = signal<Side | null>(null);
export const startedAt = signal<number | null>(null);
export const endedAt = signal<number | null>(null);

/** What the running (or last) session was started with. */
export const sessionInfo = signal<{ game: AnyGame; setup: any; players: [Player, Player] } | null>(null);

let runId = 0;
let controller: AbortController | null = null;
let resumeWaiter: (() => void) | null = null;
let nextId = 1;
let pendingNotes: string[] = [];
let paceMs = () => 1000;

export function setPaceSource(fn: () => number) {
  paceMs = fn;
}

function push(entry: Omit<FeedEntry, 'id'>): number {
  const id = nextId++;
  feed.value = [...feed.value, { ...entry, id }];
  return id;
}

function update(id: number, patch: Partial<FeedEntry>) {
  feed.value = feed.value.map((e) => (e.id === id ? { ...e, ...patch } : e));
}

function addStats(side: Side, r: ChatResult | null, invalid: boolean) {
  const next = [...stats.value] as [PlayerStats, PlayerStats];
  const s = { ...next[side] };
  if (r) {
    s.promptTokens += r.promptTokens;
    s.completionTokens += r.completionTokens;
    s.estimated ||= r.estimated;
    s.totalMs += r.ms;
    s.turns += 1;
  }
  if (invalid) s.invalid += 1;
  next[side] = s;
  stats.value = next;
}

/** Resolves when the session leaves the paused/error state. */
function waitForResume(signal: AbortSignal): Promise<void> {
  if (status.value !== 'paused' && status.value !== 'error') return Promise.resolve();
  return new Promise((resolve, reject) => {
    resumeWaiter = () => {
      resumeWaiter = null;
      resolve();
    };
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  });
}

export function start(game: AnyGame, setup: any, players: [Player, Player]) {
  controller?.abort();
  controller = new AbortController();
  const id = ++runId;
  pendingNotes = [];
  batch(() => {
    sessionInfo.value = { game, setup, players };
    gameState.value = game.create(setup);
    stateGame.value = game.id;
    feed.value = [];
    stats.value = [emptyStats(), emptyStats()];
    result.value = null;
    errorMessage.value = null;
    thinkingSide.value = null;
    startedAt.value = Date.now();
    endedAt.value = null;
    status.value = 'running';
  });
  void loop(id, controller.signal);
}

/** Show a fresh board for the selected game without starting. */
export function preview(game: AnyGame, setup: any) {
  if (status.value === 'running' || status.value === 'paused' || status.value === 'error') return;
  batch(() => {
    sessionInfo.value = null;
    gameState.value = game.create(setup);
    stateGame.value = game.id;
    feed.value = [];
    stats.value = [emptyStats(), emptyStats()];
    result.value = null;
    status.value = 'idle';
    startedAt.value = endedAt.value = null;
  });
}

export function pause() {
  if (status.value === 'running') status.value = 'paused';
}

export function resume() {
  if (status.value !== 'paused' && status.value !== 'error') return;
  errorMessage.value = null;
  status.value = 'running';
  resumeWaiter?.();
}

export function stop() {
  if (!['running', 'paused', 'error'].includes(status.value)) return;
  controller?.abort();
  controller = null;
  runId++;
  resumeWaiter = null;
  batch(() => {
    feed.value = feed.value.map((e) => (e.streaming ? { ...e, streaming: false, text: e.text || '(stopped)' } : e));
    thinkingSide.value = null;
    endedAt.value = Date.now();
    status.value = 'stopped';
  });
  push({ side: null, kind: 'system', text: 'Stopped.', reasoning: '' });
}

/** Queue a moderator note for the next turn (text games). */
export function addNote(text: string) {
  const t = text.trim();
  if (t) pendingNotes.push(t);
}

function finish(res: GameResult) {
  batch(() => {
    result.value = res;
    thinkingSide.value = null;
    endedAt.value = Date.now();
    status.value = 'finished';
  });
  push({ side: res.winner, kind: 'system', text: res.summary, reasoning: '' });
}

async function loop(id: number, signal: AbortSignal) {
  const live = () => id === runId && !signal.aborted;
  const { game, setup, players } = sessionInfo.value!;

  try {
    while (live()) {
      await waitForResume(signal);
      if (!live()) return;

      let state = gameState.value;

      if (game.inject && pendingNotes.length) {
        for (const note of pendingNotes.splice(0)) {
          state = game.inject(state, note);
          push({ side: null, kind: 'note', text: note, reasoning: '' });
        }
        gameState.value = state;
      }

      const res = game.result(state, setup);
      if (res) return finish(res);

      const side = game.currentSide(state);
      const forced = game.forcedMove?.(state, side);
      if (forced) {
        gameState.value = forced.state;
        push({ side, kind: 'turn', text: '', reasoning: '', label: forced.label });
        await sleep(Math.min(paceMs(), 800), signal);
        continue;
      }

      let feedback: string | null = null;
      let applied = false;
      for (let attemptNo = 0; attemptNo < MAX_ATTEMPTS && live(); attemptNo++) {
        const messages = game.buildMessages(state, { setup, side, me: players[side], opponent: players[1 - side], feedback });
        const entryId = push({ side, kind: 'turn', text: '', reasoning: '', streaming: true });
        thinkingSide.value = side;

        let frame = 0;
        let latest = { content: '', reasoning: '' };
        let r: ChatResult;
        try {
          r = await chat(players[side], messages, {
            signal,
            onProgress: (content, reasoning) => {
              latest = { content, reasoning };
              if (frame) return;
              frame = requestAnimationFrame(() => {
                frame = 0;
                if (!live()) return;
                const split = splitThinking(latest.content);
                update(entryId, { text: split.answer, reasoning: [latest.reasoning, split.thinking].filter(Boolean).join('\n\n') });
              });
            },
          });
        } catch (err) {
          cancelAnimationFrame(frame);
          if (isAbort(err) || !live()) return;
          feed.value = feed.value.filter((e) => e.id !== entryId);
          batch(() => {
            thinkingSide.value = null;
            errorMessage.value = `${players[side].name}: ${(err as Error).message}`;
            status.value = 'error';
          });
          await waitForResume(signal);
          attemptNo--; // API failures don't count as invalid answers
          continue;
        }
        cancelAnimationFrame(frame);
        if (!live()) return;

        const outcome = game.apply(state, side, r.content, setup);
        const tokens = r.promptTokens + r.completionTokens;
        if (outcome.ok) {
          update(entryId, { text: r.content, reasoning: r.reasoning, label: outcome.label, streaming: false, ms: r.ms, tokens });
          addStats(side, r, false);
          batch(() => {
            gameState.value = outcome.state;
            thinkingSide.value = null;
          });
          applied = true;
          break;
        }
        update(entryId, { text: r.content, reasoning: r.reasoning, invalid: outcome.reason, streaming: false, ms: r.ms, tokens });
        addStats(side, r, true);
        feedback = outcome.reason;
      }
      if (!live()) return;

      if (!applied) {
        const fb = game.fallbackMove?.(state, side);
        thinkingSide.value = null;
        if (!fb) {
          return finish({ winner: (1 - side) as Side, summary: `${players[side].name} forfeits after ${MAX_ATTEMPTS} invalid answers.` });
        }
        gameState.value = fb.state;
        push({ side, kind: 'system', text: `${players[side].name} gave ${MAX_ATTEMPTS} invalid answers — a random legal move was played: ${fb.label}`, reasoning: '', label: fb.label });
      }

      await sleep(paceMs(), signal);
    }
  } catch (err) {
    if (isAbort(err) || !live()) return;
    batch(() => {
      errorMessage.value = (err as Error).message;
      thinkingSide.value = null;
      endedAt.value = Date.now();
      status.value = 'stopped';
    });
  }
}
