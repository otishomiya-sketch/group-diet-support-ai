"use client";

import { useEffect, useState } from "react";

interface Duel {
  id: string;
  status: string;
  role: "challenger" | "opponent";
  opponentUserId: string;
  opponentDisplayName: string;
  startedAt: string | null;
  endsAt: string | null;
  isWinner: boolean | null;
  myChangeRatePercent: number | null;
  opponentChangeRatePercent: number | null;
  createdAt: string;
}

function daysRemaining(endsAt: string | null): number {
  if (!endsAt) return 0;
  const ms = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

function barWidth(rate: number): number {
  // 週次の体重減少率は数%程度が多いため、10%で満タンになるスケールで表示する。
  return Math.min(100, Math.max(0, rate) * 10);
}

export function DuelSection() {
  const [duels, setDuels] = useState<Duel[] | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    fetch("/api/duel")
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) setDuels(data.duels ?? []);
      });
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  async function respond(id: string, accept: boolean) {
    await fetch(`/api/duel/${id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accept }),
    });
    setRefreshKey((k) => k + 1);
  }

  if (!duels || duels.length === 0) {
    return null;
  }

  const incomingPending = duels.filter((d) => d.status === "pending" && d.role === "opponent");
  const outgoingPending = duels.filter((d) => d.status === "pending" && d.role === "challenger");
  const active = duels.filter((d) => d.status === "active");
  const finished = duels.filter((d) => d.status === "completed" || d.status === "declined");

  return (
    <section className="rounded-lg border border-orange-300 bg-orange-50 p-6 dark:border-orange-800 dark:bg-orange-950/30">
      <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">⚔️ 対戦</h2>

      {incomingPending.map((d) => (
        <div
          key={d.id}
          className="mb-3 flex items-center justify-between rounded-md bg-white px-4 py-2 dark:bg-zinc-900"
        >
          <span className="text-sm text-zinc-800 dark:text-zinc-200">
            {d.opponentDisplayName}さんから対戦の申し込み
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => respond(d.id, true)}
              className="rounded-full bg-orange-500 px-3 py-1 text-xs text-white hover:bg-orange-600"
            >
              承諾
            </button>
            <button
              onClick={() => respond(d.id, false)}
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              辞退
            </button>
          </div>
        </div>
      ))}

      {outgoingPending.map((d) => (
        <div
          key={d.id}
          className="mb-3 rounded-md bg-white px-4 py-2 text-sm text-zinc-500 dark:bg-zinc-900"
        >
          {d.opponentDisplayName}さんへの対戦申し込み、返答待ちです。
        </div>
      ))}

      {active.map((d) => {
        const mine = d.myChangeRatePercent ?? 0;
        const opp = d.opponentChangeRatePercent ?? 0;
        return (
          <div key={d.id} className="mb-3 rounded-md bg-white px-4 py-3 dark:bg-zinc-900">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                vs {d.opponentDisplayName}さん
              </span>
              <span className="text-xs text-zinc-500">残り{daysRemaining(d.endsAt)}日</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-20 flex-shrink-0 tabular-nums text-zinc-600 dark:text-zinc-300">
                あなた {mine.toFixed(1)}%
              </span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <span
                  className="block h-full bg-orange-500"
                  style={{ width: `${barWidth(mine)}%` }}
                />
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs">
              <span className="w-20 flex-shrink-0 tabular-nums text-zinc-600 dark:text-zinc-300">
                相手 {opp.toFixed(1)}%
              </span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <span className="block h-full bg-zinc-400" style={{ width: `${barWidth(opp)}%` }} />
              </span>
            </div>
          </div>
        );
      })}

      {finished.length > 0 && (
        <details className="text-xs text-zinc-500">
          <summary className="cursor-pointer select-none font-medium">過去の対戦結果</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {finished.map((d) => (
              <li key={d.id}>
                vs {d.opponentDisplayName}さん:{" "}
                {d.status === "declined"
                  ? "辞退されました"
                  : d.isWinner === null
                    ? "引き分け"
                    : d.isWinner
                      ? "勝利"
                      : "敗北"}
                {d.myChangeRatePercent != null && d.opponentChangeRatePercent != null
                  ? ` (${d.myChangeRatePercent.toFixed(1)}% vs ${d.opponentChangeRatePercent.toFixed(1)}%)`
                  : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
