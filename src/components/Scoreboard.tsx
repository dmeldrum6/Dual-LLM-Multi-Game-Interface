import { useEffect, useState } from 'preact/hooks';
import { Crown } from 'lucide-preact';
import { endedAt, result, startedAt, stats, status, thinkingSide } from '../engine/session';
import type { Player, Side } from '../engine/types';

function Elapsed() {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  if (!startedAt.value) return null;
  const s = Math.floor(((endedAt.value ?? Date.now()) - startedAt.value) / 1000);
  return (
    <span class="elapsed">
      {String(Math.floor(s / 60)).padStart(2, '0')}:{String(s % 60).padStart(2, '0')}
    </span>
  );
}

function PlayerChip({ p, side, label, active }: { p: Player; side: Side; label: string; active: boolean }) {
  const st = stats.value[side];
  const res = result.value;
  const won = res && res.winner === side;
  const tokens = st.promptTokens + st.completionTokens;
  return (
    <div class={`chip-player side-${side === 0 ? 'a' : 'b'} ${active ? 'active' : ''} ${won ? 'won' : ''}`}>
      <span class="avatar">{side === 0 ? 'A' : 'B'}</span>
      <div class="chip-text">
        <div class="chip-name">
          {p.name} {won && <Crown size={14} class="crown" aria-label="Winner" />}
        </div>
        <div class="muted small">
          {label} · {p.model || 'no model'}
        </div>
        <div class="chip-stats small">
          <span title="Average response time">{st.turns ? `${(st.totalMs / st.turns / 1000).toFixed(1)}s avg` : '–'}</span>
          <span title={st.estimated ? 'Estimated (server did not report usage)' : 'Tokens'}>
            {tokens ? `${st.estimated ? '~' : ''}${tokens.toLocaleString()} tok` : ''}
          </span>
          {st.invalid > 0 && <span class="warn" title="Rejected answers">{st.invalid} invalid</span>}
        </div>
      </div>
    </div>
  );
}

export function Scoreboard({ players, labels, statusText, canDraw }: { players: [Player, Player]; labels: [string, string]; statusText: string; canDraw: boolean }) {
  const s = status.value;
  const thinking = thinkingSide.value;
  const res = result.value;
  return (
    <div class="scoreboard">
      <PlayerChip p={players[0]} side={0} label={labels[0]} active={thinking === 0} />
      <div class="vs">
        <span class={`state-pill ${s}`}>{res ? (res.winner === null && canDraw ? 'Draw' : 'Finished') : s === 'idle' ? 'Ready' : s}</span>
        <span class="muted small status-text">{res ? res.summary : statusText}</span>
        <Elapsed />
      </div>
      <PlayerChip p={players[1]} side={1} label={labels[1]} active={thinking === 1} />
    </div>
  );
}
