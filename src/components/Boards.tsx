import { useMemo } from 'preact/hooks';
import { ChessBishop, ChessKing, ChessKnight, ChessPawn, ChessQueen, ChessRook } from 'lucide-preact';
import { replay, type ChessState } from '../games/chess';
import { legalMoves, type OthelloState } from '../games/othello';
import { COLS, ROWS, type Connect4State } from '../games/connect4';

const FILES = 'abcdefgh';
const ICON = { k: ChessKing, q: ChessQueen, r: ChessRook, b: ChessBishop, n: ChessKnight, p: ChessPawn };
const START: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
const ORDER = ['q', 'r', 'b', 'n', 'p'];

function Piece({ type, color, cls = '' }: { type: string; color: 'w' | 'b'; cls?: string }) {
  const Icon = ICON[type as keyof typeof ICON];
  return <Icon class={`piece ${color} ${cls}`} strokeWidth={1.6} aria-hidden="true" />;
}

function Captured({ pieces, color }: { pieces: string[]; color: 'w' | 'b' }) {
  return (
    <div class={`captured ${color}`} aria-label={`Captured ${color === 'w' ? 'white' : 'black'} pieces`}>
      {pieces.map((t) => (
        <Piece type={t} color={color} />
      ))}
    </div>
  );
}

export function ChessBoard({ state }: { state: ChessState }) {
  const { board, checkSq, captured } = useMemo(() => {
    const c = replay(state.sans);
    const board = c.board();
    let checkSq: string | null = null;
    const left: Record<string, number> = {};
    for (const row of board)
      for (const p of row) {
        if (!p) continue;
        left[p.color + p.type] = (left[p.color + p.type] ?? 0) + 1;
        if (p.type === 'k' && c.inCheck() && p.color === c.turn()) checkSq = p.square;
      }
    const lost = (color: 'w' | 'b') => ORDER.flatMap((t) => Array(Math.max(0, START[t] - (left[color + t] ?? 0))).fill(t));
    return { board, checkSq, captured: { w: lost('w'), b: lost('b') } };
  }, [state.sans.length]);

  return (
    <div class="board-wrap">
      <Captured pieces={captured.w} color="w" />
      <div class="chess" role="grid" aria-label="Chess board">
        {board.map((row, r) =>
          row.map((p, c) => {
            const sq = `${FILES[c]}${8 - r}`;
            const cls = ['sq', (r + c) % 2 ? 'dark' : 'light'];
            if (state.last && (state.last.from === sq || state.last.to === sq)) cls.push('last');
            if (checkSq === sq) cls.push('check');
            return (
              <div class={cls.join(' ')} role="gridcell" aria-label={p ? `${sq} ${p.color === 'w' ? 'white' : 'black'} ${p.type}` : sq}>
                {c === 0 && <span class="rank">{8 - r}</span>}
                {r === 7 && <span class="file">{FILES[c]}</span>}
                {p && (
                  <Piece key={state.last?.to === sq ? `${sq}-${state.sans.length}` : sq} type={p.type} color={p.color} cls={state.last?.to === sq ? 'arrive' : ''} />
                )}
              </div>
            );
          }),
        )}
      </div>
      <Captured pieces={captured.b} color="b" />
    </div>
  );
}

export function Connect4Board({ state }: { state: Connect4State }) {
  const win = new Set(state.winLine?.map(([r, c]) => `${r},${c}`));
  return (
    <div class="board-wrap c4-wrap">
      <div class="c4-cols" aria-hidden="true">
        {Array.from({ length: COLS }, (_, c) => (
          <span>{c + 1}</span>
        ))}
      </div>
      <div class="c4" role="grid" aria-label="Connect Four board">
        {state.board.map((row, r) =>
          row.map((v, c) => {
            const isLast = state.last?.row === r && state.last?.col === c;
            return (
              <div class="hole" role="gridcell" aria-label={`column ${c + 1} row ${ROWS - r}: ${v === 0 ? 'red' : v === 1 ? 'yellow' : 'empty'}`}>
                {v !== null && (
                  <span
                    key={isLast ? `${r}${c}-${state.history.length}` : `${r}${c}`}
                    class={`token ${v === 0 ? 'red' : 'yellow'} ${isLast ? 'falling' : ''} ${win.has(`${r},${c}`) ? 'win' : ''}`}
                    style={isLast ? { '--fall': `${-(r + 1) * 118}%` } : undefined}
                  />
                )}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

export function OthelloBoard({ state, hints }: { state: OthelloState; hints: boolean }) {
  const legal = hints ? legalMoves(state.board, state.turn) : [];
  const flipped = new Set(state.flipped.map(([r, c]) => `${r},${c}`));
  return (
    <div class="board-wrap">
      <div class="othello" role="grid" aria-label="Othello board">
        {state.board.map((row, r) =>
          row.map((v, c) => {
            const isLast = state.last?.row === r && state.last?.col === c;
            const isLegal = legal.some((m) => m.row === r && m.col === c);
            const name = `${'ABCDEFGH'[c]}${r + 1}`;
            return (
              <div class={`cell ${isLast ? 'last' : ''}`} role="gridcell" aria-label={`${name} ${v === 0 ? 'black' : v === 1 ? 'white' : isLegal ? 'legal move' : 'empty'}`}>
                {c === 0 && <span class="rank">{r + 1}</span>}
                {r === 7 && <span class="file">{'ABCDEFGH'[c]}</span>}
                {v !== null && (
                  <span
                    key={flipped.has(`${r},${c}`) || isLast ? `${r}${c}-${state.history.length}` : `${r}${c}`}
                    class={`disc ${v === 0 ? 'black' : 'white'} ${flipped.has(`${r},${c}`) ? 'flip' : ''} ${isLast ? 'drop' : ''}`}
                  />
                )}
                {v === null && isLegal && <span class={`hint ${state.turn === 0 ? 'black' : 'white'}`} />}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
