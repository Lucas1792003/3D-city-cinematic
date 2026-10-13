import { CHUNKS, DISTRICTS, FLOWS, MYSTERY_COPY, STORY } from './registry';
import type { ChunkDefinition } from './registry';
import styles from './City.module.css';

/**
 * The whole city as structured HTML — the fallback when WebGL is unavailable or the context is lost.
 * Generated from the same registry as the 3D scene.
 */
const nameOf = (id: string) => CHUNKS.find((c) => c.id === id)?.copy?.name ?? id;
export function evidenceText(e: 'code' | 'documented') { return e === 'code' ? 'Implemented in the platform' : 'Documented CyfroAgent behaviour'; }

export function connectionsOf(c: ChunkDefinition) {
  return FLOWS.filter((f) => f.from.chunk === c.id || f.to.chunk === c.id).map((f) => ({
    f, out: f.from.chunk === c.id, other: nameOf(f.from.chunk === c.id ? f.to.chunk : f.from.chunk),
  }));
}

export default function CityList({ onClose, failed }: { onClose?: () => void; failed?: boolean }) {
  return (
    <div className={styles.list} id="city-list">
      {failed && <p className={styles.listNote}>The 3D view is not available in this browser, so the city is shown as a list.</p>}
      <p className={styles.listNote}>An illustrative explanation of how CyfroSec works. Not live data.</p>
      {DISTRICTS.map((d) => {
        const chunks = CHUNKS.filter((c) => c.district === d.id);
        if (!chunks.length) return null;
        return (
          <section key={d.id} aria-labelledby={`list-d-${d.id}`} className={styles.listDistrict}>
            <h3 id={`list-d-${d.id}`}>{d.name}</h3>
            <p className={styles.listSummary}>{d.summary}</p>
            <ul>
              {chunks.map((c) => (
                <li key={c.id}>
                  {c.copy ? (
                    <>
                      <h4>{c.copy.name}</h4>
                      <p>{c.copy.summary} {c.copy.details}</p>
                      {connectionsOf(c).length > 0 && (
                        <ul className={styles.listFlows}>
                          {connectionsOf(c).map(({ f, out, other }) => (
                            <li key={f.id}><span>{out ? `→ ${other}` : `← ${other}`}</span> {f.label} <em>({evidenceText(f.evidence)}{f.display === 'hidden' ? '; not animated' : ''})</em></li>
                          ))}
                        </ul>
                      )}
                      {c.href && <a href={c.href}>Learn more about {c.copy.name}</a>}
                    </>
                  ) : (
                    <><h4>{MYSTERY_COPY.label}</h4><p>{MYSTERY_COPY.body}</p></>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <section className={styles.listDistrict} aria-labelledby="list-workflows">
        <h3 id="list-workflows">Verified workflows</h3>
        {([['infra', 'Infrastructure scan'], ['code', 'Code security']] as const).map(([k, name]) => (
          <div key={k}>
            <h4>{name}</h4>
            <ol>{STORY.filter((b) => b.track === k && b.caption).map((b) => <li key={b.id}>{b.caption}</li>)}</ol>
          </div>
        ))}
      </section>
      {onClose && <button type="button" className={styles.btn} onClick={onClose}>Back to the 3D view</button>}
    </div>
  );
}
