import type { GameDef, Side } from '../engine/types';
import { markedMove, personaBlock, pickRandom, TABLE_TALK } from './common';

export type Cell = Side | null;

export interface OthelloSetup {
  showLegalMoves: boolean;
}

export interface OthelloState {
  board: Cell[][];
  turn: Side;
  history: string[];
  last: { row: number; col: number } | null;
  flipped: [number, number][];
  /** Consecutive passes; two means the game is over. */
  passes: number;
}

const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const FILES = 'ABCDEFGH';

export const coord = (row: number, col: number) => `${FILES[col]}${row + 1}`;

export function flipsFor(board: Cell[][], row: number, col: number, side: Side): [number, number][] {
  if (board[row][col] !== null) return [];
  const out: [number, number][] = [];
  for (const [dr, dc] of DIRS) {
    const line: [number, number][] = [];
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] === 1 - side) {
      line.push([r, c]);
      r += dr;
      c += dc;
    }
    if (line.length && r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] === side) out.push(...line);
  }
  return out;
}

export function legalMoves(board: Cell[][], side: Side): { row: number; col: number }[] {
  const out = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (flipsFor(board, r, c, side).length) out.push({ row: r, col: c });
  return out;
}

export function counts(board: Cell[][]): [number, number] {
  let b = 0;
  let w = 0;
  for (const row of board) for (const v of row) v === 0 ? b++ : v === 1 && w++;
  return [b, w];
}

function play(state: OthelloState, row: number, col: number): OthelloState {
  const flips = flipsFor(state.board, row, col, state.turn);
  const board = state.board.map((r) => [...r]);
  board[row][col] = state.turn;
  for (const [r, c] of flips) board[r][c] = state.turn;
  return {
    board,
    turn: (1 - state.turn) as Side,
    history: [...state.history, coord(row, col)],
    last: { row, col },
    flipped: flips,
    passes: 0,
  };
}

function renderBoard(board: Cell[][]): string {
  const rows = board.map((r, i) => `${i + 1} ${r.map((v) => (v === 0 ? 'B' : v === 1 ? 'W' : '.')).join(' ')}`);
  return `  ${FILES.split('').join(' ')}\n${rows.join('\n')}`;
}

export const othelloGame: GameDef<OthelloState, OthelloSetup> = {
  id: 'othello',
  name: 'Othello',
  tagline: 'Flank and flip. Most discs wins.',
  kind: 'board',
  sideLabels: () => ['Black', 'White'],
  defaultSetup: { showLegalMoves: true },

  create() {
    const board: Cell[][] = Array.from({ length: 8 }, () => Array<Cell>(8).fill(null));
    board[3][3] = 1;
    board[3][4] = 0;
    board[4][3] = 0;
    board[4][4] = 1;
    return { board, turn: 0, history: [], last: null, flipped: [], passes: 0 };
  },

  currentSide: (s) => s.turn,

  buildMessages(state, { setup, side, me, opponent, feedback }) {
    const color = side === 0 ? 'Black (B)' : 'White (W)';
    const [b, w] = counts(state.board);
    const system =
      `You are playing Othello (Reversi) as ${color} against ${opponent.name}. ` +
      'A move places a disc so that it flanks one or more opponent discs in a straight line; those discs flip to your colour. ' +
      'Corners are valuable; squares next to an empty corner are risky.\n' +
      `${TABLE_TALK}\nMOVE: <column letter A-H><row number 1-8>, e.g. MOVE: D3` +
      personaBlock(me);
    const lines = [
      `Board (B = Black, W = White, . = empty; row 1 is the top):\n${renderBoard(state.board)}`,
      `Score: Black ${b}, White ${w}`,
      `Moves so far: ${state.history.join(' ') || '(none)'}`,
    ];
    if (setup.showLegalMoves) lines.push(`Your legal moves: ${legalMoves(state.board, side).map((m) => coord(m.row, m.col)).join(', ')}`);
    if (feedback) lines.push(`Your previous answer was rejected: ${feedback}.`);
    lines.push(`You are ${color}. Your move.`);
    return [
      { role: 'system', content: system },
      { role: 'user', content: lines.join('\n\n') },
    ];
  },

  apply(state, side, answer) {
    const parse = (s: string) => {
      const m = s.toUpperCase().match(/([A-H])\s*-?\s*([1-8])/);
      return m ? { col: FILES.indexOf(m[1]), row: Number(m[2]) - 1 } : null;
    };
    const marked = markedMove(answer);
    let pos = marked ? parse(marked) : null;
    if (!pos) {
      const all = [...answer.toUpperCase().matchAll(/\b([A-H])([1-8])\b/g)];
      if (all.length) pos = parse(all[all.length - 1][0]);
    }
    if (!pos) return { ok: false, reason: 'no "MOVE: <square>" line was found' };
    const name = coord(pos.row, pos.col);
    if (state.board[pos.row][pos.col] !== null) return { ok: false, reason: `${name} is already occupied` };
    if (!flipsFor(state.board, pos.row, pos.col, side).length) return { ok: false, reason: `${name} does not flip any discs, so it is not legal` };
    return { ok: true, state: play(state, pos.row, pos.col), label: name };
  },

  forcedMove(state, side) {
    if (legalMoves(state.board, side).length) return null;
    return {
      state: { ...state, turn: (1 - side) as Side, history: [...state.history, 'pass'], flipped: [], passes: state.passes + 1 },
      label: 'pass (no legal moves)',
    };
  },

  fallbackMove(state, side) {
    const m = pickRandom(legalMoves(state.board, side));
    return m ? { state: play(state, m.row, m.col), label: coord(m.row, m.col) } : null;
  },

  result(state) {
    const done = state.passes >= 2 || (!legalMoves(state.board, 0).length && !legalMoves(state.board, 1).length);
    if (!done) return null;
    const [b, w] = counts(state.board);
    if (b === w) return { winner: null, summary: `Game over — ${b}–${w}. It's a tie.` };
    return { winner: b > w ? 0 : 1, summary: `Game over — ${b > w ? 'Black' : 'White'} wins ${Math.max(b, w)}–${Math.min(b, w)}.` };
  },

  status(state) {
    const [b, w] = counts(state.board);
    return `${state.turn === 0 ? 'Black' : 'White'} to move · ${b}–${w}`;
  },
};
