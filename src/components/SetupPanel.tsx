import { setups } from '../lib/settings';
import { gameById } from '../games';
import { GENRES } from '../games/story';

export function getSetup(id: string): any {
  return { ...gameById(id).defaultSetup, ...setups.value[id] };
}

function patch(id: string, p: Record<string, unknown>) {
  setups.value = { ...setups.value, [id]: { ...setups.value[id], ...p } };
}

function Num({ id, k, label, min, max, step = 1 }: { id: string; k: string; label: string; min: number; max: number; step?: number }) {
  const v = getSetup(id)[k];
  return (
    <label class="field">
      <span>
        {label} <em class="muted">{v}</em>
      </span>
      <input type="range" min={min} max={max} step={step} value={v} onInput={(e) => patch(id, { [k]: Number(e.currentTarget.value) })} />
    </label>
  );
}

function Toggle({ id, k, label }: { id: string; k: string; label: string }) {
  return (
    <label class="check">
      <input type="checkbox" checked={!!getSetup(id)[k]} onChange={(e) => patch(id, { [k]: e.currentTarget.checked })} />
      {label}
    </label>
  );
}

function Text({ id, k, label, rows = 3 }: { id: string; k: string; label: string; rows?: number }) {
  return (
    <label class="field">
      <span>{label}</span>
      <textarea rows={rows} value={getSetup(id)[k]} onInput={(e) => patch(id, { [k]: e.currentTarget.value })} />
    </label>
  );
}

export function SetupPanel({ id, locked }: { id: string; locked: boolean }) {
  const s = getSetup(id);
  return (
    <section class="card">
      <h2 class="card-title">Game setup</h2>
      <fieldset disabled={locked} class="stack">
        {id === 'chess' && (
          <>
            <Toggle id={id} k="showLegalMoves" label="Show legal moves to the models (recommended for small models)" />
            <Num id={id} k="maxMoves" label="Move limit (then adjudicate on material)" min={20} max={200} />
          </>
        )}
        {(id === 'othello' || id === 'connect4') && <Toggle id={id} k="showLegalMoves" label="Show legal moves to the models" />}
        {id === 'conversation' && (
          <>
            <div class="segmented" role="radiogroup" aria-label="Format">
              {(['chat', 'debate'] as const).map((f) => (
                <button type="button" role="radio" aria-checked={s.format === f} class={s.format === f ? 'on' : ''} onClick={() => patch(id, { format: f, turns: f === 'debate' ? Math.max(4, s.turns + (s.turns % 2)) : s.turns })}>
                  {f === 'chat' ? 'Open chat' : 'Debate'}
                </button>
              ))}
            </div>
            {s.format === 'chat' ? (
              <Text id={id} k="topic" label="Topic" />
            ) : (
              <>
                <Text id={id} k="motion" label="Motion (Player A argues for, B against)" />
                <p class="muted small hint-text">Opening statements, then rebuttals, then closing statements.</p>
              </>
            )}
            <Num id={id} k="turns" label="Turns" min={s.format === 'debate' ? 4 : 2} max={40} step={s.format === 'debate' ? 2 : 1} />
            <Num id={id} k="maxWords" label="Max words per reply" min={20} max={400} step={10} />
            {s.format === 'debate' && (
              <>
                <Toggle id={id} k="judge" label="Have a judge pick the winner" />
                {s.judge && (
                  <div class="row">
                    <label class="field grow">
                      <span>Judge uses</span>
                      <select value={s.judgeSide} onChange={(e) => patch(id, { judgeSide: Number(e.currentTarget.value) })}>
                        <option value={0}>Player A's server</option>
                        <option value={1}>Player B's server</option>
                      </select>
                    </label>
                    <label class="field grow">
                      <span>Model</span>
                      <input value={s.judgeModel} placeholder="same as player" spellcheck={false} onInput={(e) => patch(id, { judgeModel: e.currentTarget.value })} />
                    </label>
                  </div>
                )}
              </>
            )}
          </>
        )}
        {id === 'story' && (
          <>
            <Text id={id} k="premise" label="Premise" />
            <label class="field">
              <span>Genre</span>
              <select value={s.genre} onChange={(e) => patch(id, { genre: e.currentTarget.value })}>
                {GENRES.map((g) => (
                  <option>{g}</option>
                ))}
              </select>
            </label>
            <Num id={id} k="sentences" label="Sentences per passage" min={1} max={6} />
            <Num id={id} k="turns" label="Passages" min={2} max={40} />
          </>
        )}
      </fieldset>
      {Object.keys(setups.value[id] ?? {}).length > 0 && !locked && (
        <button
          type="button"
          class="link"
          onClick={() => {
            const { [id]: _, ...rest } = setups.value;
            setups.value = rest;
          }}
        >
          Reset to defaults
        </button>
      )}
    </section>
  );
}
