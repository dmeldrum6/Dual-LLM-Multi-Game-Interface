import { memo } from 'preact/compat';
import { useEffect, useMemo, useRef } from 'preact/hooks';
import { Brain, TriangleAlert } from 'lucide-preact';
import { renderMarkdown } from '../lib/markdown';
import type { FeedEntry } from '../engine/session';
import type { Player } from '../engine/types';

export function Markdown({ text }: { text: string }) {
  const html = useMemo(() => renderMarkdown(text), [text]);
  return <div class="md" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Thinking({ text, live }: { text: string; live?: boolean }) {
  if (!text) return null;
  return (
    <details class="thinking" open={live}>
      <summary>
        <Brain size={14} /> {live ? 'Thinking…' : `Reasoning (${text.split(/\s+/).length} words)`}
      </summary>
      <div class="thinking-body">{text}</div>
    </details>
  );
}

export function Dots() {
  return (
    <span class="dots" aria-label="Thinking">
      <i />
      <i />
      <i />
    </span>
  );
}

const fmtMs = (ms?: number) => (ms === undefined ? '' : ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`);

/** Strip the trailing "MOVE: x" line so the bubble shows only the table talk. */
function talkOnly(text: string): string {
  const all = [...text.matchAll(/\bmove\s*[:=]/gi)];
  if (!all.length) return text.trim();
  const at = all[all.length - 1].index!;
  const lineStart = text.lastIndexOf('\n', at) + 1;
  const before = text.slice(lineStart, at);
  // Keep text on the same line before the marker ("Good luck! MOVE: e4").
  return (text.slice(0, lineStart) + (/[a-z]{3,}/i.test(before) ? before.replace(/[\s*_`]*(my\s*)?$/i, '') : '')).trim();
}

export const FeedItem = memo(function FeedItem({ e, players, sideLabels }: { e: FeedEntry; players: [Player, Player]; sideLabels: [string, string] }) {
  if (e.kind === 'system' || e.kind === 'note') {
    return (
      <li class={`feed-sys ${e.kind}`}>
        {e.kind === 'note' && <strong>Moderator: </strong>}
        {e.text}
      </li>
    );
  }
  const side = e.side!;
  const talk = talkOnly(e.text);
  return (
    <li class={`feed-item side-${side === 0 ? 'a' : 'b'} ${e.invalid ? 'invalid' : ''}`}>
      <div class="feed-meta">
        <span class="avatar sm">{side === 0 ? 'A' : 'B'}</span>
        <strong>{players[side].name}</strong>
        <span class="muted small">{sideLabels[side]}</span>
        <span class="spacer" />
        {e.ms !== undefined && <span class="muted small">{fmtMs(e.ms)}</span>}
      </div>
      <Thinking text={e.reasoning} live={e.streaming && !e.text} />
      {e.streaming && !e.text && !e.reasoning && <Dots />}
      {talk && <div class="talk">{e.streaming ? e.text : talk}</div>}
      {e.label && <div class="move-badge">{e.label}</div>}
      {e.invalid && (
        <div class="invalid-note">
          <TriangleAlert size={14} /> Rejected: {e.invalid}
        </div>
      )}
    </li>
  );
});

export function Feed({ entries, players, sideLabels }: { entries: FeedEntry[]; players: [Player, Player]; sideLabels: [string, string] }) {
  const ref = useRef<HTMLOListElement>(null);
  useStickToBottom(ref, entries);
  return (
    <ol class="feed" ref={ref} aria-live="polite">
      {entries.length === 0 && <li class="empty muted">Moves and table talk will appear here.</li>}
      {entries.map((e) => (
        <FeedItem key={e.id} e={e} players={players} sideLabels={sideLabels} />
      ))}
    </ol>
  );
}

/** Keep a scroll container pinned to the bottom unless the user scrolled up. */
export function useStickToBottom(ref: { current: HTMLElement | null }, dep: unknown) {
  const pinned = useRef(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => (pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60);
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [dep]);
}
