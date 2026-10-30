import type { ChatMessage, Connection } from '../lib/llm';

export type Side = 0 | 1;

export interface Player extends Connection {
  name: string;
  persona: string;
}

export interface TurnContext<Setup> {
  setup: Setup;
  side: Side;
  me: Player;
  opponent: Player;
  /** Why the previous attempt this turn was rejected, if it was. */
  feedback: string | null;
}

export type ApplyResult<State> =
  | { ok: true; state: State; label: string }
  | { ok: false; reason: string };

export interface GameResult {
  /** null = draw. */
  winner: Side | null;
  summary: string;
}

export interface GameDef<State, Setup> {
  id: string;
  name: string;
  tagline: string;
  /** Board games show the side-by-side feed; text games use the stage only. */
  kind: 'board' | 'text';
  sideLabels: (setup: Setup) => [string, string];
  defaultSetup: Setup;
  create(setup: Setup): State;
  currentSide(state: State): Side;
  buildMessages(state: State, ctx: TurnContext<Setup>): ChatMessage[];
  apply(state: State, side: Side, answer: string, setup: Setup): ApplyResult<State>;
  /** A move to play without asking the model (e.g. a forced pass). */
  forcedMove?(state: State, side: Side): { state: State; label: string } | null;
  /** Played after repeated invalid answers so the game keeps going. */
  fallbackMove?(state: State, side: Side): { state: State; label: string } | null;
  result(state: State, setup: Setup): GameResult | null;
  /** Add a moderator note (text games). */
  inject?(state: State, note: string): State;
  /** Optional judging step run after the game ends (e.g. debates). */
  verdict?(state: State, setup: Setup, players: [Player, Player]): Verdict | null;
  /** Short status line, e.g. "White to move". */
  status?(state: State, setup: Setup): string;
}

export interface Verdict {
  judge: Player;
  messages: ChatMessage[];
  parse(answer: string): GameResult;
}

export type AnyGame = GameDef<any, any>;
