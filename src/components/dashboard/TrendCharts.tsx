"use client";

import { useMemo, useRef, useState } from "react";

import type { CalorieTrendPoint, WeightTrendPoint } from "@/lib/checkin/trends";
import {
  COLOR,
  CHART_WIDTH,
  CHART_HEIGHT,
  MARGIN,
  PLOT_WIDTH,
  PLOT_HEIGHT,
  niceTicks,
  formatDateLabel,
  Tooltip,
  EmptyState,
  WeightTrendChart,
  type TooltipState,
} from "@/components/charts/chart-kit";

const RANGE_OPTIONS = [
  { days: 7, label: "7日" },
  { days: 30, label: "30日" },
  { days: 90, label: "90日" },
];

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function rangeWindow(days: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  return { start: dateKey(start), end: dateKey(end) };
}

function CalorieBarChart({
  points,
  targetPerDay,
}: {
  points: CalorieTrendPoint[];
  targetPerDay: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  if (points.length === 0) {
    return (
      <EmptyState message="まだ食事の記録がありません。LINEで食事の写真を送ると、AIが推定したカロリーがここに表示されます。" />
    );
  }

  const maxValue = Math.max(...points.map((p) => p.calories), targetPerDay);
  const yMax = maxValue * 1.15;
  const yFor = (v: number) => PLOT_HEIGHT - (v / yMax) * PLOT_HEIGHT;
  const xFor = (i: number) =>
    points.length === 1 ? PLOT_WIDTH / 2 : (i / (points.length - 1)) * PLOT_WIDTH;
  const barWidth = Math.min(24, PLOT_WIDTH / Math.max(points.length, 1) - 4);

  const ticks = niceTicks(0, Math.round(yMax / 100) * 100, 4);

  function handlePointerFor(i: number, clientX: number, clientY: number) {
    void clientX;
    void clientY;
    const p = points[i];
    setTooltip({
      x: MARGIN.left + xFor(i),
      y: MARGIN.top + yFor(p.calories),
      title: formatDateLabel(p.date),
      rows: [
        {
          label: "摂取カロリー(AI推定)",
          value: `${p.calories.toLocaleString()} kcal`,
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
        onPointerLeave={() => setTooltip(null)}
        role="img"
        aria-label={`摂取カロリーの推移。1日あたりの消費目安 ${Math.round(targetPerDay).toLocaleString()}kcal`}
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
                {t.toLocaleString()}
              </text>
            </g>
          ))}

          {points.map((p, i) => (
            <rect
              key={p.date}
              x={xFor(i) - barWidth / 2}
              y={yFor(p.calories)}
              width={barWidth}
              height={Math.max(PLOT_HEIGHT - yFor(p.calories), 0)}
              rx={4}
              className="fill-[#2a78d6] dark:fill-[#3987e5]"
              tabIndex={0}
              role="button"
              aria-label={`${formatDateLabel(p.date)}の摂取カロリー推定 ${p.calories}kcal`}
              onPointerEnter={(e) => handlePointerFor(i, e.clientX, e.clientY)}
              onFocus={() => handlePointerFor(i, 0, 0)}
              onBlur={() => setTooltip(null)}
            />
          ))}

          <line
            x1={0}
            x2={PLOT_WIDTH}
            y1={yFor(targetPerDay)}
            y2={yFor(targetPerDay)}
            className="stroke-[#898781]"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          <text
            x={PLOT_WIDTH}
            y={yFor(targetPerDay) - 6}
            textAnchor="end"
            className="fill-[#52514e] text-[10px] dark:fill-[#c3c2b7]"
          >
            消費目安 {Math.round(targetPerDay).toLocaleString()}kcal
          </text>
        </g>
      </svg>
      <Tooltip tooltip={tooltip} />
    </div>
  );
}

function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="max-h-56 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-left font-medium text-zinc-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-1.5 tabular-nums text-zinc-700 dark:text-zinc-300">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TrendCharts({
  weightSeries,
  calorieSeries,
  calorieTargetPerDay,
}: {
  weightSeries: WeightTrendPoint[];
  calorieSeries: CalorieTrendPoint[];
  calorieTargetPerDay: number;
}) {
  const [rangeDays, setRangeDays] = useState(30);
  const [showWeightTable, setShowWeightTable] = useState(false);
  const [showCalorieTable, setShowCalorieTable] = useState(false);

  const { start, end } = useMemo(() => rangeWindow(rangeDays), [rangeDays]);

  const filteredWeight = useMemo(
    () => weightSeries.filter((p) => p.date >= start && p.date <= end),
    [weightSeries, start, end],
  );
  const filteredCalorie = useMemo(
    () => calorieSeries.filter((p) => p.date >= start && p.date <= end),
    [calorieSeries, start, end],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.days}
            onClick={() => setRangeDays(opt.days)}
            className={
              opt.days === rangeDays
                ? "rounded-full bg-zinc-900 px-3 py-1 text-xs text-white dark:bg-zinc-50 dark:text-black"
                : "rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            }
          >
            {opt.label}
          </button>
        ))}
      </div>

      <section className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">体重の推移</h2>
          {filteredWeight.length > 0 && (
            <button
              onClick={() => setShowWeightTable((v) => !v)}
              className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              {showWeightTable ? "グラフを表示" : "テーブルで表示"}
            </button>
          )}
        </div>
        {showWeightTable && filteredWeight.length > 0 ? (
          <DataTable
            headers={["日付", "体重(kg)"]}
            rows={filteredWeight
              .slice()
              .reverse()
              .map((p) => [formatDateLabel(p.date), p.weightKg.toFixed(1)])}
          />
        ) : (
          <WeightTrendChart
            points={filteredWeight}
            emptyMessage="まだ体重の記録がありません。LINEで体重を報告すると、ここに推移が表示されます。"
          />
        )}
      </section>

      <section className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            摂取カロリー・消費目安の推移
          </h2>
          {filteredCalorie.length > 0 && (
            <button
              onClick={() => setShowCalorieTable((v) => !v)}
              className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              {showCalorieTable ? "グラフを表示" : "テーブルで表示"}
            </button>
          )}
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#2a78d6] dark:bg-[#3987e5]" />
            摂取カロリー(AI画像解析による推定)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-[#898781]" />
            消費目安(基礎代謝×活動量、暫定式)
          </span>
        </div>
        {showCalorieTable && filteredCalorie.length > 0 ? (
          <DataTable
            headers={["日付", "推定カロリー(kcal)"]}
            rows={filteredCalorie
              .slice()
              .reverse()
              .map((p) => [formatDateLabel(p.date), p.calories.toLocaleString()])}
          />
        ) : (
          <CalorieBarChart points={filteredCalorie} targetPerDay={calorieTargetPerDay} />
        )}
        <p className="mt-3 text-xs text-zinc-400">
          消費目安は実測ではなく、現在の体重・身長・年齢から算出した推定値です(バイタル機器等による実測は行いません)。
        </p>
      </section>
    </div>
  );
}
