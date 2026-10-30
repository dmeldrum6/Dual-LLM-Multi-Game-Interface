import { useState } from 'preact/hooks';
import { Send, Sparkles } from 'lucide-preact';
import { addNote } from '../engine/session';
import { pickRandom } from '../games/common';

const TWISTS = [
  'A character is not who they claim to be.',
  'The power goes out — everywhere.',
  'Someone receives a letter dated fifty years in the future.',
  'An animal starts talking, and it is furious.',
  'It was all being broadcast live the whole time.',
  'A long-lost twin appears.',
  'The weather does something impossible.',
  'The villain asks for help.',
];

export function ModeratorBar({ mode }: { mode: 'conversation' | 'story' }) {
  const [text, setText] = useState('');
  const [queued, setQueued] = useState(0);
  const send = (t: string) => {
    if (!t.trim()) return;
    addNote(t);
    setText('');
    setQueued((n) => n + 1);
    setTimeout(() => setQueued((n) => Math.max(0, n - 1)), 2500);
  };
  return (
    <form
      class="moderator"
      onSubmit={(e) => {
        e.preventDefault();
        send(text);
      }}
    >
      <input
        value={text}
        onInput={(e) => setText(e.currentTarget.value)}
        placeholder={mode === 'story' ? 'Throw in a plot twist…' : 'Say something as the moderator…'}
        aria-label={mode === 'story' ? 'Plot twist' : 'Moderator message'}
      />
      {mode === 'story' && (
        <button type="button" class="btn ghost" title="Random twist" onClick={() => send(pickRandom(TWISTS)!)}>
          <Sparkles size={16} /> Random
        </button>
      )}
      <button type="submit" class="btn" disabled={!text.trim()}>
        <Send size={15} /> Send
      </button>
      {queued > 0 && <span class="muted small">Queued for the next turn</span>}
    </form>
  );
}
