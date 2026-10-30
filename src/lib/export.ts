import { feed, gameState, result, sessionInfo, startedAt, endedAt, stats } from '../engine/session';

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => new Date().toISOString().slice(0, 19).replace(/:/g, '-');

export function exportJson() {
  const info = sessionInfo.value;
  if (!info) return;
  const data = {
    app: 'dual-llm-multi-game-interface',
    version: 2,
    game: info.game.id,
    setup: info.setup,
    players: info.players.map(({ apiKey: _key, ...p }) => p),
    startedAt: startedAt.value && new Date(startedAt.value).toISOString(),
    endedAt: endedAt.value && new Date(endedAt.value).toISOString(),
    result: result.value,
    stats: stats.value,
    finalState: gameState.value,
    feed: feed.value.map(({ streaming: _s, ...e }) => e),
  };
  download(`dual-llm-${info.game.id}-${stamp()}.json`, JSON.stringify(data, null, 2), 'application/json');
}
