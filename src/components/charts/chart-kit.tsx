"use client";

import { useRef, useState } from "react";

import type { WeightTrendPoint } from "@/lib/checkin/trends";

// 色は dataviz スキルの参照パレット(references/palette.md)に準拠。
// 系列は常にblue(--series-1)一色。目安ラインはmuted inkで描く注釈であり、系列色ではない。
export const COLOR = {
  series1Light: "#2a78d6",
  series1Dark: "#3987e5",
  gridLight: "#e1e0d9",
  gridDark: "#2c2c2a",
  baselineLight: "#c3c2b7",
  baselineDark: "#383835",
  mutedLight: "#898781",
  mutedDark: "#898781",
  textPrimaryLight: "#0b0b0b",
  textPrimaryDark: "#ffffff",
  textSecondaryLight: "#52514e",
  textSecondaryDark: "#c3c2b7",
};

export const CHART_WIDTH = 640;
export const CHART_HEIGHT = 220;
export const MARGIN = { top: 16, right: 16, bottom: 28, left: 44 };
export const PLOT_WIDTH = CHART_WIDTH - MARGIN.left - MARGIN.right;
export const PLOT_HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;

export function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    return [min];
  }
  const step = (max - min) / (count - 1);
  const rounded = Array.from({ length: count }, (_, i) => Math.round(min + step * i));
  // 値域が狭いと隣り合う目盛りが同じ整数に丸められることがあるため、重複を除く
  // (Reactのkey重複警告や、同じ位置に目盛りが二重描画される問題を防ぐ)。
  return Array.from(new Set(rounded));
}

export function formatDateLabel(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export interface TooltipState {
  x: number;
  y: number;
  title: string;
  rows: { label: string; value: string; colorLight: string; colorDark: string }[];
}

export function Tooltip({ tooltip }: { tooltip: TooltipState | null }) {
  if (!tooltip) return null;
  return (
    <div
      className="pointer-events-none absolute z-10 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs shadow-md dark:border-zinc-700 dark:bg-zinc-900"
      style={{
        left: `${(tooltip.x / CHART_WIDTH) * 100}%`,
        top: `${(tooltip.y / CHART_HEIGHT) * 100}%`,
        transform: "translate(-50%, -110%)",
      }}
    >
      <p className="mb-1 font-semibold text-zinc-900 dark:text-zinc-50">{tooltip.title}</p>
      {tooltip.rows.map((row, i) => (
        <p key={i} className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
          <span
            aria-hidden
            className="inline-block h-0.5 w-3"
            style={{ backgroundColor: row.colorLight }}
          />
          <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
            {row.value}
          </span>
          <span>{row.label}</span>
        </p>
      ))}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{ height: CHART_HEIGHT }}
      className="flex items-center justify-center text-sm text-zinc-400"
    >
      {message}
    </div>
  );
}

export function WeightTrendChart({
  points,
  emptyMessage = "まだ体重の記録がありません。",
}: {
  points: WeightTrendPoint[];
  emptyMessage?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  if (points.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  const values = points.map((p) => p.weightKg);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const pad = Math.max((rawMax - rawMin) * 0.15, 0.5);
  const yMin = rawMin - pad;
  const yMax = rawMax + pad;

  const xFor = (i: number) =>
    points.length === 1 ? PLOT_WIDTH / 2 : (i / (points.length - 1)) * PLOT_WIDTH;
  const yFor = (v: number) => PLOT_HEIGHT - ((v - yMin) / (yMax - yMin)) * PLOT_HEIGHT;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(p.weightKg)}`)
    .join(" ");

  const ticks = niceTicks(yMin, yMax, 4);
  const last = points[points.length - 1];

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const localX = ((e.clientX - rect.left) / rect.width) * CHART_WIDTH - MARGIN.left;
    let nearest = 0;
    let bestDist = Infinity;
    points.forEach((_, i) => {
      const dist = Math.abs(xFor(i) - localX);
      if (dist < bestDist) {
        bestDist = dist;
        nearest = i;
      }
    });
    const p = points[nearest];
    setTooltip({
      x: MARGIN.left + xFor(nearest),
      y: MARGIN.top + yFor(p.weightKg),
      title: formatDateLabel(p.date),
      rows: [
        {
          label: "体重",
          value: `${p.weightKg.toFixed(1)} kg`,
          colorLight: COLOR.series1Light,
          colorDark: COLOR.series1Dark,
        },
      ],
    });
  }

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full"
        onPointerMove={handleMove}
        onPointerLeave={() => setTooltip(null)}
        role="img"
        aria-label={`体重の推移。最新値 ${last.weightKg.toFixed(1)}kg(${formatDateLabel(last.date)})`}
      >
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={0}
                x2={PLOT_WIDTH}
                y1={yFor(t)}
                y2={yFor(t)}
                className="stroke-[#e1e0d9] dark:stroke-[#2c2c2a]"
                strokeWidth={1}
              />
              <text
                x={-8}
                y={yFor(t)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-[#898781] text-[10px] tabular-nums"
              >
                {t}
              </text>
            </g>
          ))}

          {tooltip && (
            <line
              x1={tooltip.x - MARGIN.left}
              x2={tooltip.x - MARGIN.left}
              y1={0}
              y2={PLOT_HEIGHT}
              className="stroke-[#c3c2b7] dark:stroke-[#383835]"
              strokeWidth={1}
            />
          )}

          <path
            d={linePath}
            fill="none"
            className="stroke-[#2a78d6] dark:stroke-[#3987e5]"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          <circle
            cx={xFor(points.length - 1)}
            cy={yFor(last.weightKg)}
            r={5}
            className="fill-[#2a78d6] stroke-[#fcfcfb] dark:fill-[#3987e5] dark:stroke-[#1a1a19]"
            strokeWidth={2}
          />
          <text
            x={xFor(points.length - 1) - 6}
            y={yFor(last.weightKg) - 10}
            textAnchor="end"
            className="fill-zinc-900 text-[11px] font-semibold tabular-nums dark:fill-zinc-50"
          >
            {last.weightKg.toFixed(1)}kg
          </text>
        </g>
      </svg>
      <Tooltip tooltip={tooltip} />
    </div>
  );
}
