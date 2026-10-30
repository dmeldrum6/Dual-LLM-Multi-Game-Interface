import { useEffect } from 'preact/hooks';
import { BookOpen, ChessKnight, CircleDot, Download, MessagesSquare, Monitor, Moon, PanelLeftClose, PanelLeftOpen, Pause, Play, RotateCcw, Square, Sun, TriangleAlert } from 'lucide-preact';
import { GAMES, gameById } from './games';
import { gameId, pace, players, rememberKeys, resolvedPlayers, sidebarOpen, theme, type Theme } from './lib/settings';
import * as session from './engine/session';
import { exportJson } from './lib/export';
import { PlayerCard } from './components/PlayerCard';
import { getSetup, SetupPanel } from './components/SetupPanel';
import { Scoreboard } from './components/Scoreboard';
import { ChessBoard, OthelloBoard } from './components/Boards';
import { Feed } from './components/Feed';
import { ConversationView, StoryView } from './components/TextStages';

session.setPaceSource(() => pace.value);

const THEMES: { id: Theme; icon: typeof Sun; label: string }[] = [
  { id: 'light', icon: Sun, label: 'Light' },
  { id: 'system', icon: Monitor, label: 'System' },
  { id: 'dark', icon: Moon, label: 'Dark' },
];

const GAME_ICONS: Record<string, typeof Sun> = { chess: ChessKnight, othello: CircleDot, conversation: MessagesSquare, story: BookOpen };

const isActive = (s: session.Status) => s === 'running' || s === 'paused' || s === 'error';

function startGame() {
  const game = gameById(gameId.value);
  const ps = resolvedPlayers();
  const missing = ps.findIndex((p) => !p.model.trim());
  if (missing !== -1) {
    session.errorMessage.value = `Choose a model for Player ${missing === 0 ? 'A' : 'B'} first.`;
    if (!sidebarOpen.value) sidebarOpen.value = true;
    return;
  }
  session.start(game, getSetup(game.id), ps);
}

function togglePause() {
  const s = session.status.value;
  if (s === 'running') session.pause();
  else if (s === 'paused' || s === 'error') session.resume();
}

function Controls() {
  const s = session.status.value;
  const active = isActive(s);
  return (
    <div class="controls">
      {!active ? (
        <button class="btn primary" onClick={startGame}>
          {s === 'idle' ? <Play size={16} /> : <RotateCcw size={16} />} {s === 'idle' ? 'Start' : 'New game'}
        </button>
      ) : (
        <>
          <button class="btn" onClick={togglePause} title="Space">
            {s === 'running' ? <Pause size={16} /> : <Play size={16} />} {s === 'running' ? 'Pause' : s === 'error' ? 'Retry' : 'Resume'}
          </button>
          <button class="btn danger" onClick={session.stop}>
            <Square size={14} /> Stop
          </button>
        </>
      )}
      <label class="pace" title="Pause between turns">
        <span class="muted small">Pace</span>
        <input type="range" min={0} max={5000} step={100} value={pace.value} onInput={(e) => (pace.value = Number(e.currentTarget.value))} />
        <span class="small mono">{(pace.value / 1000).toFixed(1)}s</span>
      </label>
      <span class="spacer" />
      <button class="btn ghost" disabled={!session.sessionInfo.value || session.feed.value.length === 0} onClick={exportJson}>
        <Download size={16} /> Export
      </button>
    </div>
  );
}

function Stage() {
  const info = session.sessionInfo.value;
  const game = info?.game ?? gameById(gameId.value);
  const setup = info?.setup ?? getSetup(game.id);
  const ps = info?.players ?? resolvedPlayers();
  const state = session.stateGame.value === game.id ? session.gameState.value : null;
  const entries = session.feed.value;
  const labels = game.sideLabels(setup);
  const s = session.status.value;
  const statusText = state && game.status ? game.status(state, setup) : '';

  let main;
  if (!state) main = null;
  else if (game.id === 'chess') main = <ChessBoard state={state} />;
  else if (game.id === 'othello') main = <OthelloBoard state={state} hints={!session.result.value} />;
  else if (game.id === 'story') main = <StoryView state={state} entries={entries} players={ps} title={setup.premise} finished={!!session.result.value} />;
  else main = <ConversationView entries={entries} players={ps} empty={`Topic: ${setup.topic}`} />;

  return (
    <main class="stage">
      <Scoreboard players={ps} labels={labels} statusText={statusText} canDraw={game.kind === 'board'} />
      <Controls />
      {session.errorMessage.value && (
        <div class="banner error" role="alert">
          <TriangleAlert size={16} />
          <span>{session.errorMessage.value}</span>
          {s === 'error' && (
            <button class="btn small" onClick={session.resume}>
              Retry
            </button>
          )}
          {s !== 'error' && (
            <button class="btn small ghost" onClick={() => (session.errorMessage.value = null)}>
              Dismiss
            </button>
          )}
        </div>
      )}
      <div class={`arena ${game.kind}`}>
        <div class="arena-main">{main}</div>
        {game.kind === 'board' && <Feed entries={entries} players={ps} sideLabels={labels} />}
      </div>
    </main>
  );
}

export function App() {
  const s = session.status.value;
  const locked = isActive(s);
  const game = gameById(gameId.value);
  const labels = game.sideLabels(getSetup(game.id));

  useEffect(() => {
    session.preview(game, getSetup(game.id));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, button, [contenteditable]')) return;
      e.preventDefault();
      togglePause();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div class={`app ${sidebarOpen.value ? '' : 'collapsed'}`}>
      <header class="topbar">
        <button class="icon-btn" onClick={() => (sidebarOpen.value = !sidebarOpen.value)} aria-label="Toggle settings panel">
          {sidebarOpen.value ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>
        <div class="brand">
          <span class="logo" aria-hidden="true">
            <i />
            <i />
          </span>
          Dual LLM Arena
        </div>
        <nav class="tabs" role="tablist" aria-label="Game">
          {GAMES.map((g) => (
            <button
              role="tab"
              aria-selected={g.id === game.id}
              class={`tab ${g.id === game.id ? 'on' : ''}`}
              disabled={locked && g.id !== game.id}
              title={locked ? 'Stop the current game to switch' : g.tagline}
              onClick={() => {
                gameId.value = g.id;
                session.preview(g, getSetup(g.id));
              }}
            >
              {(() => {
                const Icon = GAME_ICONS[g.id] ?? CircleDot;
                return <Icon size={15} aria-hidden="true" />;
              })()}
              {g.name}
            </button>
          ))}
        </nav>
        <div class="theme-switch" role="radiogroup" aria-label="Theme">
          {THEMES.map((t) => (
            <button role="radio" aria-checked={theme.value === t.id} class={theme.value === t.id ? 'on' : ''} title={t.label} onClick={() => (theme.value = t.id)}>
              <t.icon size={15} />
            </button>
          ))}
        </div>
      </header>

      <aside class="sidebar" aria-label="Settings">
        <PlayerCard side={0} sideLabel={labels[0]} locked={locked} />
        <PlayerCard side={1} sideLabel={labels[1]} locked={locked} />
        {players.value.some((p) => p.apiKey) && (
          <label class="check small remember">
            <input type="checkbox" checked={rememberKeys.value} onChange={(e) => (rememberKeys.value = e.currentTarget.checked)} />
            Remember API keys on this device (stored unencrypted)
          </label>
        )}
        <SetupPanel id={game.id} locked={locked} />
        {locked && <p class="muted small center">Settings are locked while a game is running.</p>}
      </aside>

      <Stage />
    </div>
  );
}
