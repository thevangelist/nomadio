import type { Sample } from '@/lib/useHistory';
import { mbps } from '@/lib/format';

const W = 600;
const H = 64;

/** Bitrate over the last few minutes, with every non-live second drawn as a red band. */
export default function QualityChart({ samples }: { samples: Sample[] }) {
  if (samples.length < 2) {
    return (
      <div className="chart">
        <div className="chart-head">
          <span className="label">Quality over time</span>
          <span className="chart-now">collecting…</span>
        </div>
        <div className="chart-empty" />
      </div>
    );
  }

  const values = samples.map((s) => s.bitrateKbps ?? 0);
  const peak = Math.max(...values, 1);
  const x = (i: number) => (i / (samples.length - 1)) * W;
  const y = (v: number) => H - (v / peak) * (H - 4) - 2;

  const line = samples.map((s, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(s.bitrateKbps ?? 0).toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;

  const bands: Array<[number, number]> = [];
  samples.forEach((s, i) => {
    if (s.live) return;
    const last = bands.at(-1);
    if (last && last[1] === i - 1) last[1] = i;
    else bands.push([i, i]);
  });

  const latest = samples.at(-1)!;

  return (
    <div className="chart">
      <div className="chart-head">
        <span className="label">Quality over time</span>
        <span className="chart-now mono">
          {mbps(latest.bitrateKbps)} · peak {mbps(peak)}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="chart-svg" role="img" aria-label="Bitrate over time">
        {bands.map(([a, b]) => (
          <rect key={a} x={x(a)} y={0} width={Math.max(x(b) - x(a), 2)} height={H} className="chart-band" />
        ))}
        <path d={area} className="chart-area" />
        <path d={line} className="chart-line" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="chart-foot">
        <span>{Math.round((samples.length * 1) / 60)} min</span>
        <span>now</span>
      </div>
    </div>
  );
}
