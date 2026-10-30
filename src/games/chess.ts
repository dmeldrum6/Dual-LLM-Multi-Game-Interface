import { Chess, type Square } from 'chess.js';
import type { GameDef, Side } from '../engine/types';
import { markedMove, personaBlock, pickRandom, TABLE_TALK } from './common';

export interface ChessSetup {
  showLegalMoves: boolean;
  maxMoves: number;
}

export interface ChessState {
  sans: string[];
  last: { from: string; to: string } | null;
}

const VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export function replay(sans: string[]): Chess {
  const c = new Chess();
  for (const san of sans) c.move(san);
  return c;
}

/** Material balance from White's point of view. */
export function material(c: Chess): number {
  let score = 0;
  for (const row of c.board()) for (const p of row) if (p) score += (p.color === 'w' ? 1 : -1) * VALUES[p.type];
  return score;
}

function normalizeToken(raw: string): string {
  return raw
    .trim()
    .replace(/^\d+\.(\.\.)?\s*/, '')
    .replace(/[`*"'“”]/g, '')
    .replace(/[.,;:!?)]+$/, '')
    .replace(/0-0-0/g, 'O-O-O')
    .replace(/0-0/g, 'O-O')
    .replace(/[‐-―]/g, '-');
}

/** Try a token as SAN or UCI; returns the SAN played, or null. */
function tryMove(c: Chess, raw: string): string | null {
  const token = normalizeToken(raw);
  if (!token) return null;
  try {
    return c.move(token).san;
  } catch {
    /* not SAN */
  }
  const uci = token.toLowerCase().match(/^([a-h][1-8])-?([a-h][1-8])([qrbn])?$/);
  if (uci) {
    try {
      return c.move({ from: uci[1] as Square, to: uci[2] as Square, promotion: uci[3] ?? 'q' }).san;
    } catch {
      /* illegal */
    }
  }
  return null;
}

function apply(state: ChessState, san: string): ChessState {
  const c = replay(state.sans);
  const m = c.move(san);
  return { sans: [...state.sans, m.san], last: { from: m.from, to: m.to } };
}

export function movePairs(sans: string[]): string {
  const out: string[] = [];
  for (let i = 0; i < sans.length; i += 2) out.push(`${i / 2 + 1}. ${sans[i]}${sans[i + 1] ? ' ' + sans[i + 1] : ''}`);
  return out.join(' ');
}

export const chessGame: GameDef<ChessState, ChessSetup> = {
  id: 'chess',
  name: 'Chess',
  tagline: 'Full rules: castling, en passant, promotion, draws.',
  kind: 'board',
  sideLabels: () => ['White', 'Black'],
  defaultSetup: { showLegalMoves: true, maxMoves: 100 },

  create: () => ({ sans: [], last: null }),
  currentSide: (s) => (s.sans.length % 2) as Side,

  buildMessages(state, { setup, side, me, opponent, feedback }) {
    const c = replay(state.sans);
    const color = side === 0 ? 'White' : 'Black';
    const system =
      `You are playing chess as ${color} against ${opponent.name}. Play the strongest move you can find.\n` +
      `${TABLE_TALK}\nMOVE: <your move in standard algebraic notation, e.g. e4, Nf3, exd5, O-O, e8=Q>` +
      personaBlock(me);

    const lines = [
      `Position (FEN): ${c.fen()}`,
      `Board (uppercase = White, lowercase = Black):\n${c.ascii()}`,
      `Moves so far: ${movePairs(state.sans) || '(none — this is the first move)'}`,
    ];
    if (state.sans.length) lines.push(`${opponent.name}'s last move: ${state.sans[state.sans.length - 1]}`);
    if (c.inCheck()) lines.push('You are in CHECK.');
    if (setup.showLegalMoves) lines.push(`Your legal moves: ${c.moves().join(', ')}`);
    if (feedback) lines.push(`Your previous answer was rejected: ${feedback}. Choose a legal move.`);
    lines.push(`You are ${color}. Your move.`);
    return [
      { role: 'system', content: system },
      { role: 'user', content: lines.join('\n\n') },
    ];
  },

  apply(state, _side, answer) {
    const c = replay(state.sans);
    const marked = markedMove(answer);
    if (marked) {
      const san = tryMove(c, marked);
      if (san) return { ok: true, state: apply(state, san), label: san };
      return { ok: false, reason: `"${normalizeToken(marked)}" is not a legal move in this position` };
    }
    // No MOVE line: take the last legal-looking token in the reply.
    const tokens = answer.split(/\s+/).reverse();
    for (const t of tokens) {
      const san = tryMove(replay(state.sans), t);
      if (san) return { ok: true, state: apply(state, san), label: san };
    }
    return { ok: false, reason: 'no "MOVE: <move>" line with a legal move was found' };
  },

  fallbackMove(state) {
    const san = pickRandom(replay(state.sans).moves());
    return san ? { state: apply(state, san), label: san } : null;
  },

  result(state, setup) {
    const c = replay(state.sans);
    const mover = c.turn() === 'w' ? 'White' : 'Black';
    if (c.isCheckmate()) return { winner: c.turn() === 'w' ? 1 : 0, summary: `Checkmate — ${mover === 'White' ? 'Black' : 'White'} wins.` };
    if (c.isStalemate()) return { winner: null, summary: `Stalemate — ${mover} has no legal moves. Draw.` };
    if (c.isThreefoldRepetition()) return { winner: null, summary: 'Draw by threefold repetition.' };
    if (c.isInsufficientMaterial()) return { winner: null, summary: 'Draw by insufficient material.' };
    if (c.isDrawByFiftyMoves()) return { winner: null, summary: 'Draw by the fifty-move rule.' };
    if (setup.maxMoves > 0 && state.sans.length >= setup.maxMoves * 2) {
      const m = material(c);
      if (m === 0) return { winner: null, summary: `Move limit (${setup.maxMoves}) reached with equal material. Draw.` };
      return { winner: m > 0 ? 0 : 1, summary: `Move limit (${setup.maxMoves}) reached — ${m > 0 ? 'White' : 'Black'} wins on material (+${Math.abs(m)}).` };
    }
    return null;
  },

  status(state) {
    const c = replay(state.sans);
    return `${c.turn() === 'w' ? 'White' : 'Black'} to move${c.inCheck() ? ' — check!' : ''}`;
  },
};
