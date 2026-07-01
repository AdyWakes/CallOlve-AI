import { cn } from "@/lib/utils";

/**
 * Dependency-free chart primitives. Pure SVG/CSS, rendered on the server —
 * no client JS, no chart library, theme-aware via design tokens.
 */

// ─────────────────────────────────────────────── Area chart

export function AreaChart({
  points,
  height = 200,
  className,
}: {
  points: { label: string; value: number; secondary?: number }[];
  height?: number;
  className?: string;
}) {
  const W = 640;
  const H = height;
  const PAD = { top: 12, right: 8, bottom: 22, left: 8 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const max = Math.max(1, ...points.map((p) => p.value));
  const n = Math.max(points.length, 2);

  const x = (i: number) => PAD.left + (i / (n - 1)) * innerW;
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${PAD.top + innerH} L${PAD.left},${PAD.top + innerH} Z`;

  // x labels: at most ~6
  const step = Math.max(1, Math.ceil(points.length / 6));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={cn("w-full", className)}
      role="img"
      aria-label="Call volume over time"
    >
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* gridlines */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1={PAD.left}
          x2={W - PAD.right}
          y1={PAD.top + innerH * f}
          y2={PAD.top + innerH * f}
          stroke="currentColor"
          className="text-line"
          strokeDasharray="3 5"
        />
      ))}
      <path d={area} fill="url(#areaFill)" />
      <path d={line} fill="none" stroke="#22d3ee" strokeWidth={2} strokeLinejoin="round" />
      {/* last point */}
      {points.length > 0 ? (
        <circle
          cx={x(points.length - 1)}
          cy={y(points[points.length - 1]!.value)}
          r={4}
          fill="#22d3ee"
        />
      ) : null}
      {/* x labels */}
      {points.map((p, i) =>
        i % step === 0 ? (
          <text
            key={i}
            x={x(i)}
            y={H - 6}
            textAnchor="middle"
            fontSize={10}
            fill="currentColor"
            className="text-faint"
          >
            {p.label}
          </text>
        ) : null
      )}
      {/* max label */}
      <text x={PAD.left} y={PAD.top + 4} fontSize={10} fill="currentColor" className="text-faint">
        {max}
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────── Donut

const DONUT_COLORS = ["#22d3ee", "#8b5cf6", "#34d399", "#fbbf24", "#f87171", "#f472b6", "#94a3b8"];

export function Donut({
  segments,
  centerLabel,
  centerValue,
  className,
}: {
  segments: { label: string; value: number }[];
  centerLabel?: string;
  centerValue?: string;
  className?: string;
}) {
  const total = Math.max(
    segments.reduce((s, x) => s + x.value, 0),
    1
  );
  const R = 42;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className={cn("flex items-center gap-6", className)}>
      <svg viewBox="0 0 120 120" className="size-36 shrink-0 -rotate-90" role="img" aria-label={centerLabel}>
        <circle cx="60" cy="60" r={R} fill="none" stroke="#1d2336" strokeWidth="14" />
        {segments.map((seg, i) => {
          const frac = seg.value / total;
          const dash = `${(frac * C).toFixed(2)} ${(C - frac * C).toFixed(2)}`;
          const el = (
            <circle
              key={seg.label}
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
              strokeWidth="14"
              strokeDasharray={dash}
              strokeDashoffset={(-offset * C).toFixed(2)}
            />
          );
          offset += frac;
          return el;
        })}
        <g className="rotate-90" transform-origin="60 60">
          <text x="60" y="58" textAnchor="middle" fontSize="18" fontWeight="700" fill="#eef1f8">
            {centerValue}
          </text>
          <text x="60" y="74" textAnchor="middle" fontSize="9" fill="#5d6680">
            {centerLabel}
          </text>
        </g>
      </svg>
      <ul className="min-w-0 flex-1 space-y-2">
        {segments.map((seg, i) => (
          <li key={seg.label} className="flex items-center gap-2.5 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
            />
            <span className="truncate text-mute">{seg.label}</span>
            <span className="ml-auto font-medium text-fg">
              {Math.round((seg.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────── Horizontal bar list

export function BarList({
  items,
  className,
}: {
  items: { label: string; value: number; color?: string }[];
  className?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-mute">{item.label}</span>
            <span className="font-medium text-fg">{item.value}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-raised">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(item.value / max) * 100}%`,
                background: item.color ?? "linear-gradient(90deg,#22d3ee,#8b5cf6)",
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ─────────────────────────────────────────────── Hour heat strip

export function HeatStrip({
  hours,
  className,
}: {
  hours: { hour: number; count: number }[];
  className?: string;
}) {
  const visible = hours.filter((h) => h.hour >= 8 && h.hour <= 21);
  const max = Math.max(1, ...visible.map((h) => h.count));
  return (
    <div className={className}>
      <div className="flex gap-1">
        {visible.map((h) => (
          <div
            key={h.hour}
            title={`${formatHour(h.hour)}: ${h.count} call${h.count === 1 ? "" : "s"}`}
            className="h-9 flex-1 rounded"
            style={{
              backgroundColor: `color-mix(in oklab, #22d3ee ${Math.round((h.count / max) * 85) + 5}%, #161b2c)`,
            }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-faint">
        <span>8 AM</span>
        <span>12 PM</span>
        <span>5 PM</span>
        <span>9 PM</span>
      </div>
    </div>
  );
}

function formatHour(h: number): string {
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${period}`;
}

// ─────────────────────────────────────────────── Sparkline

export function Sparkline({
  points,
  min = 1,
  max = 5,
  className,
}: {
  points: { label: string; value: number }[];
  min?: number;
  max?: number;
  className?: string;
}) {
  if (points.length === 0) {
    return <p className="text-sm text-faint">Not enough data yet.</p>;
  }
  const W = 300;
  const H = 56;
  const n = Math.max(points.length, 2);
  const x = (i: number) => (i / (n - 1)) * (W - 8) + 4;
  const y = (v: number) => H - 8 - ((v - min) / (max - min)) * (H - 16);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn("w-full", className)} role="img" aria-label="Trend">
      <path d={path} fill="none" stroke="#34d399" strokeWidth={2} strokeLinejoin="round" />
      <circle cx={x(points.length - 1)} cy={y(points[points.length - 1]!.value)} r={3.5} fill="#34d399" />
    </svg>
  );
}
