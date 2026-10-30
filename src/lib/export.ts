import { movePairs } from '../games/chess';
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

const SIDE = (side: number | null, names: string[]) => (side === null ? 'Moderator' : names[side]);

export function exportMarkdown() {
  const info = sessionInfo.value;
  if (!info) return;
  const { game, setup, players } = info;
  const names = players.map((p) => p.name);
  const labels = game.sideLabels(setup);
  const out: string[] = [`# ${game.name}: ${names[0]} vs ${names[1]}`, ''];
  out.push(`- **${labels[0]}:** ${names[0]} (\`${players[0].model}\`)`, `- **${labels[1]}:** ${names[1]} (\`${players[1].model}\`)`);
  if (startedAt.value) out.push(`- **Played:** ${new Date(startedAt.value).toLocaleString()}`);
  if (result.value) out.push(`- **Result:** ${result.value.summary}`);
  out.push('');

  if (game.id === 'story') {
    out.push(`> ${setup.premise}`, '');
    for (const p of gameState.value.passages) out.push(p.side === null ? `*[Plot twist: ${p.text}]*` : p.text, '');
  } else {
    if (game.id === 'conversation') out.push(`> ${setup.format === 'debate' ? `Motion: ${setup.motion}` : setup.topic}`, '');
    for (const e of feed.value) {
      if (e.kind === 'system') out.push(`*${e.text}*`, '');
      else if (e.kind === 'note') out.push(`**Moderator:** ${e.text}`, '');
      else if (e.kind === 'verdict') out.push(`### Judge's verdict`, '', e.text, '');
      else {
        const move = e.label ? ` — \`${e.label}\`` : '';
        const bad = e.invalid ? ` *(rejected: ${e.invalid})*` : '';
        out.push(`**${SIDE(e.side, names)}**${move}${bad}`, '', e.text || '_(no text)_', '');
      }
    }
  }
  download(`dual-llm-${game.id}-${stamp()}.md`, out.join('\n'), 'text/markdown');
}

export function exportPgn() {
  const info = sessionInfo.value;
  if (!info || info.game.id !== 'chess') return;
  const sans: string[] = gameState.value.sans;
  const res = result.value;
  const tag = !res ? '*' : res.winner === 0 ? '1-0' : res.winner === 1 ? '0-1' : '1/2-1/2';
  const d = new Date(startedAt.value ?? Date.now());
  const headers = {
    Event: 'Dual LLM Arena',
    Site: 'Local',
    Date: `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`,
    Round: '-',
    White: `${info.players[0].name} (${info.players[0].model})`,
    Black: `${info.players[1].name} (${info.players[1].model})`,
    Result: tag,
    ...(res ? { Termination: res.summary } : {}),
  };
  const body = `${movePairs(sans)} ${tag}`.replace(/(.{1,79})(\s|$)/g, '$1\n');
  const pgn = Object.entries(headers).map(([k, v]) => `[${k} "${String(v).replace(/"/g, "'")}"]`).join('\n') + '\n\n' + body;
  download(`dual-llm-chess-${stamp()}.pgn`, pgn, 'application/x-chess-pgn');
}
