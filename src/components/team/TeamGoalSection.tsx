"use client";

import { useEffect, useState } from "react";

interface TeamGoalItem {
  id: string;
  targetAchievementRate: number;
  durationDays: number;
  stakeDescription: string | null;
  status: string;
  achieved: boolean | null;
  finalAchievementRate: number | null;
  currentAchievementRate?: number;
  createdAt: string;
  endsAt: string;
}

interface TeamGoalsResponse {
  active: TeamGoalItem | null;
  history: TeamGoalItem[];
}

const TARGET_RATES = [30, 50, 70, 90];
const DURATIONS = [7, 14, 30];

function daysRemaining(endsAt: string): number {
  const ms = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function TeamGoalSection() {
  const [data, setData] = useState<TeamGoalsResponse | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [targetAchievementRate, setTargetAchievementRate] = useState(50);
  const [durationDays, setDurationDays] = useState(14);
  const [stakeDescription, setStakeDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    fetch("/api/team-goal")
      .then((res) => res.json())
      .then((json) => {
        if (!ignore) setData(json);
      });
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  async function submitGoal() {
    setSubmitting(true);
    setStatus(null);
    const res = await fetch("/api/team-goal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetAchievementRate,
        durationDays,
        stakeDescription: stakeDescription.trim() || null,
      }),
    });
    const json = await res.json();
    setStatus(res.ok ? "チーム目標を設定しました!" : (json.error ?? "設定に失敗しました。"));
    setSubmitting(false);
    if (res.ok) {
      setFormOpen(false);
      setStakeDescription("");
      setRefreshKey((k) => k + 1);
    }
  }

  const active = data?.active ?? null;
  const history = data?.history ?? [];

  return (
    <section className="rounded-lg border border-emerald-300 bg-emerald-50 p-6 dark:border-emerald-800 dark:bg-emerald-950/30">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">🎯 チーム目標</h2>
        {!active && (
          <button
            onClick={() => setFormOpen((v) => !v)}
            className="rounded-full bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-700"
          >
            目標を設定する
          </button>
        )}
      </div>

      {!active && formOpen && (
        <div className="mb-4 flex flex-col gap-3 rounded-md bg-white p-3 dark:bg-zinc-900">
          <div>
            <p className="mb-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">目標達成率</p>
            <div className="flex gap-2">
              {TARGET_RATES.map((rate) => (
                <button
                  key={rate}
                  onClick={() => setTargetAchievementRate(rate)}
                  className={
                    targetAchievementRate === rate
                      ? "rounded-full bg-zinc-900 px-3 py-1 text-xs text-white dark:bg-zinc-50 dark:text-black"
                      : "rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }
                >
                  {rate}%
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">期間</p>
            <div className="flex gap-2">
              {DURATIONS.map((days) => (
                <button
                  key={days}
                  onClick={() => setDurationDays(days)}
                  className={
                    durationDays === days
                      ? "rounded-full bg-zinc-900 px-3 py-1 text-xs text-white dark:bg-zinc-50 dark:text-black"
                      : "rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }
                >
                  {days}日間
                </button>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">
            賭けの内容(任意・実際の金銭のやり取りはありません)
            <input
              value={stakeDescription}
              onChange={(e) => setStakeDescription(e.target.value)}
              maxLength={200}
              placeholder="例:達成できなかったら罰ゲームで自己紹介LT大会"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <div className="flex gap-2">
            <button
              onClick={submitGoal}
              disabled={submitting}
              className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? "設定中..." : "この内容で設定する"}
            </button>
            <button
              onClick={() => setFormOpen(false)}
              className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {status && <p className="mb-3 text-xs text-zinc-500">{status}</p>}

      {active && (
        <div className="mb-3 rounded-md bg-white px-4 py-3 dark:bg-zinc-900">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-zinc-900 dark:text-zinc-50">
              目標達成率 {active.targetAchievementRate}%
            </span>
            <span className="text-xs text-zinc-500">残り{daysRemaining(active.endsAt)}日</span>
          </div>
          {active.stakeDescription && (
            <p className="mb-2 text-xs text-zinc-500">賭けの内容:{active.stakeDescription}</p>
          )}
          <div className="flex items-center gap-2 text-xs">
            <span className="w-24 flex-shrink-0 tabular-nums text-zinc-600 dark:text-zinc-300">
              現在 {(active.currentAchievementRate ?? 0).toFixed(1)}%
            </span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <span
                className="block h-full bg-emerald-600"
                style={{
                  width: `${Math.min(100, ((active.currentAchievementRate ?? 0) / active.targetAchievementRate) * 100)}%`,
                }}
              />
            </span>
          </div>
        </div>
      )}

      {!active && !formOpen && (
        <p className="text-xs text-zinc-500">
          チーム全体の平均達成率を目標にして、みんなで一緒に取り組めます。
        </p>
      )}

      {history.length > 0 && (
        <details className="text-xs text-zinc-500">
          <summary className="cursor-pointer select-none font-medium">過去のチーム目標</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {history.map((g) => (
              <li key={g.id}>
                目標{g.targetAchievementRate}%・{g.durationDays}日間:{" "}
                {g.achieved ? "達成" : "未達成"}
                {g.finalAchievementRate != null ? ` (結果 ${g.finalAchievementRate.toFixed(1)}%)` : ""}
                {g.stakeDescription ? `・賭け:${g.stakeDescription}` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
