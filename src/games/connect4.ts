import type { GameDef, Side } from '../engine/types';
import { markedMove, personaBlock, pickRandom, TABLE_TALK } from './common';

export const ROWS = 6;
export const COLS = 7;

export type C4Cell = Side | null;

export interface Connect4Setup {
  showLegalMoves: boolean;
}

export interface Connect4State {
  /** board[0] is the top row. */
  board: C4Cell[][];
  turn: Side;
  history: number[];
  last: { row: number; col: number } | null;
  winLine: [number, number][] | null;
}

export const openColumns = (board: C4Cell[][]) => [...Array(COLS).keys()].filter((c) => board[0][c] === null);

function findLine(board: C4Cell[][], row: number, col: number): [number, number][] | null {
  const side = board[row][col];
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const line: [number, number][] = [[row, col]];
    for (const dir of [1, -1]) {
      let r = row + dr * dir;
      let c = col + dc * dir;
      while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === side) {
        line.push([r, c]);
        r += dr * dir;
        c += dc * dir;
      }
    }
    if (line.length >= 4) return line;
  }
  return null;
}

function drop(state: Connect4State, col: number): Connect4State {
  const board = state.board.map((r) => [...r]);
  let row = ROWS - 1;
  while (board[row][col] !== null) row--;
  board[row][col] = state.turn;
  return { board, turn: (1 - state.turn) as Side, history: [...state.history, col + 1], last: { row, col }, winLine: findLine(board, row, col) };
}

function render(board: C4Cell[][]): string {
  const rows = board.map((r) => '| ' + r.map((v) => (v === 0 ? 'R' : v === 1 ? 'Y' : '.')).join(' ') + ' |');
  return `  ${[...Array(COLS).keys()].map((c) => c + 1).join(' ')}\n${rows.join('\n')}`;
}

export const connect4Game: GameDef<Connect4State, Connect4Setup> = {
  id: 'connect4',
  name: 'Connect Four',
  tagline: 'Drop discs, line up four.',
  kind: 'board',
  sideLabels: () => ['Red', 'Yellow'],
  defaultSetup: { showLegalMoves: true },

  create: () => ({ board: Array.from({ length: ROWS }, () => Array<C4Cell>(COLS).fill(null)), turn: 0, history: [], last: null, winLine: null }),
  currentSide: (s) => s.turn,

  buildMessages(state, { setup, side, me, opponent, feedback }) {
    const color = side === 0 ? 'Red (R)' : 'Yellow (Y)';
    const system =
      `You are playing Connect Four as ${color} against ${opponent.name}. ` +
      'Players take turns dropping a disc into one of 7 columns; it falls to the lowest empty row. ' +
      'Four in a row horizontally, vertically or diagonally wins. Always block your opponent’s three-in-a-row.\n' +
      `${TABLE_TALK}\nMOVE: <column number 1-7>` +
      personaBlock(me);
    const lines = [
      `Board (R = Red, Y = Yellow, . = empty; the bottom row is the last line):\n${render(state.board)}`,
      `Columns played so far: ${state.history.join(' ') || '(none)'}`,
    ];
    if (setup.showLegalMoves) lines.push(`Your legal moves: ${openColumns(state.board).map((c) => c + 1).join(', ')}`);
    if (feedback) lines.push(`Your previous answer was rejected: ${feedback}.`);
    lines.push(`You are ${color}. Your move.`);
    return [
      { role: 'system', content: system },
      { role: 'user', content: lines.join('\n\n') },
    ];
  },

  apply(state, _side, answer) {
    const marked = markedMove(answer);
    let num = marked?.match(/[1-7]/)?.[0];
    if (!num) {
      const all = [...answer.matchAll(/\b([1-7])\b/g)];
      num = all[all.length - 1]?.[1];
    }
    if (!num) return { ok: false, reason: 'no "MOVE: <column 1-7>" line was found' };
    const col = Number(num) - 1;
    if (state.board[0][col] !== null) return { ok: false, reason: `column ${num} is full` };
    return { ok: true, state: drop(state, col), label: `column ${num}` };
  },

  fallbackMove(state) {
    const col = pickRandom(openColumns(state.board));
    return col === undefined ? null : { state: drop(state, col), label: `column ${col + 1}` };
  },

  result(state) {
    if (state.winLine) {
      const w = (1 - state.turn) as Side;
      return { winner: w, summary: `Four in a row — ${w === 0 ? 'Red' : 'Yellow'} wins!` };
    }
    if (!openColumns(state.board).length) return { winner: null, summary: 'The board is full. Draw.' };
    return null;
  },

  status: (state) => `${state.turn === 0 ? 'Red' : 'Yellow'} to move`,
};
