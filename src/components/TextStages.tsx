import { useRef } from 'preact/hooks';
import { TriangleAlert } from 'lucide-preact';
import { Dots, Markdown, Thinking, useStickToBottom } from './Feed';
import type { FeedEntry } from '../engine/session';
import type { Player } from '../engine/types';
import type { StoryState } from '../games/story';

export function ConversationView({ entries, players, empty }: { entries: FeedEntry[]; players: [Player, Player]; empty: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useStickToBottom(ref, entries);
  return (
    <div class="chat" ref={ref} aria-live="polite">
      {entries.length === 0 && <p class="empty muted">{empty}</p>}
      {entries.map((e) => {
        if (e.kind === 'system') return <p class="chat-sys" key={e.id}>{e.text}</p>;
        if (e.kind === 'note')
          return (
            <p class="chat-note" key={e.id}>
              <strong>Moderator</strong> {e.text}
            </p>
          );
        if (e.kind === 'verdict')
          return (
            <div class="verdict" key={e.id}>
              <Markdown text={e.text} />
            </div>
          );
        const side = e.side!;
        return (
          <div class={`bubble-row side-${side === 0 ? 'a' : 'b'}`} key={e.id}>
            <span class="avatar">{side === 0 ? 'A' : 'B'}</span>
            <div class={`bubble ${e.invalid ? 'invalid' : ''}`}>
              <div class="bubble-name">{players[side].name}</div>
              <Thinking text={e.reasoning} live={e.streaming && !e.text} />
              {e.streaming && !e.text && !e.reasoning ? <Dots /> : <Markdown text={e.text} />}
              {e.invalid && (
                <div class="invalid-note">
                  <TriangleAlert size={14} /> {e.invalid}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function StoryView({ state, entries, players, title, finished }: { state: StoryState | null; entries: FeedEntry[]; players: [Player, Player]; title: string; finished: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const live = entries.find((e) => e.streaming && e.kind === 'turn');
  useStickToBottom(ref, [state?.passages.length, live?.text]);
  const passages = state?.passages ?? [];
  return (
    <div class="manuscript" ref={ref}>
      <div class="page">
        <h2 class="story-title">{title}</h2>
        {passages.length === 0 && !live && <p class="empty muted">The story will be written here, one passage at a time.</p>}
        {passages.map((p, i) =>
          p.side === null ? (
            <p class="twist" key={i}>
              <span>Plot twist</span> {p.text}
            </p>
          ) : (
            <p class={`passage side-${p.side === 0 ? 'a' : 'b'}`} key={i} title={players[p.side].name}>
              {p.text}
            </p>
          ),
        )}
        {live && (
          <p class={`passage side-${live.side === 0 ? 'a' : 'b'} live`}>
            {live.text || <Dots />}
          </p>
        )}
        {finished && <p class="the-end">The End</p>}
      </div>
      <div class="legend">
        <span class="side-a">
          <i /> {players[0].name}
        </span>
        <span class="side-b">
          <i /> {players[1].name}
        </span>
      </div>
    </div>
  );
}
