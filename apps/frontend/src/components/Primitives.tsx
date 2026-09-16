import { DASH } from '@/lib/format';

export type Dot = 'ok' | 'warn' | 'crit' | 'idle';

/** Label, figure, and one caption line — every card keeps the same three-line rhythm. */
export function Metric({
  label,
  value,
  caption,
  tone,
}: {
  label: string;
  value: string;
  caption?: string;
  tone?: 'warn' | 'crit';
}) {
  const cls = value === DASH ? 'unknown' : (tone ?? '');
  return (
    <div className="card metric">
      <div className="label">{label}</div>
      <div className={`value ${cls}`}>{value}</div>
      <div className="caption">{caption ?? '\u00a0'}</div>
    </div>
  );
}

export function Row({ k, sub, v, dot }: { k: string; sub?: string; v: string; dot?: Dot }) {
  return (
    <div className="row">
      {dot ? <i className={`dot ${dot === 'idle' ? '' : dot}`} /> : null}
      <span className="k">
        {k}
        {sub ? <span className="sub">{sub}</span> : null}
      </span>
      <span className="v">{v}</span>
    </div>
  );
}

export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
