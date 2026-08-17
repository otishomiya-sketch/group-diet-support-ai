"use client";

import { useEffect, useState } from "react";

interface TeamDuelItem {
  id: string;
  status: string;
  role: "challenger" | "opponent";
  opponentLabel: string;
  durationDays: number;
  stakeDescription: string | null;
  startedAt: string | null;
  endsAt: string | null;
  isWinner: boolean | null;
  myRatePercent: number | null;
  opponentRatePercent: number | null;
  createdAt: string;
}

function daysRemaining(endsAt: string | null): number {
  if (!endsAt) return 0;
  const ms = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

function barWidth(rate: number): number {
  return Math.min(100, Math.max(0, rate) * 10);
}

export function TeamDuelSection() {
  const [teamDuels, setTeamDuels] = useState<TeamDuelItem[] | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [opponentInviteCode, setOpponentInviteCode] = useState("");
  const [durationDays, setDurationDays] = useState(7);
  const [stakeDescription, setStakeDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    fetch("/api/team-duel")
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) setTeamDuels(data.teamDuels ?? []);
      });
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  async function respond(id: string, accept: boolean) {
    await fetch(`/api/team-duel/${id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accept }),
    });
    setRefreshKey((k) => k + 1);
  }

  async function submitChallenge() {
    setSubmitting(true);
    setStatus(null);
    const res = await fetch("/api/team-duel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        opponentInviteCode,
        durationDays,
        stakeDescription: stakeDescription.trim() || null,
      }),
    });
    const json = await res.json();
    setStatus(res.ok ? "対戦を申し込みました!相手チームの承諾を待っています。" : (json.error ?? "申し込みに失敗しました。"));
    setSubmitting(false);
    if (res.ok) {
      setFormOpen(false);
      setOpponentInviteCode("");
      setStakeDescription("");
      setRefreshKey((k) => k + 1);
    }
  }

  const incomingPending = (teamDuels ?? []).filter((d) => d.status === "pending" && d.role === "opponent");
  const outgoingPending = (teamDuels ?? []).filter((d) => d.status === "pending" && d.role === "challenger");
  const active = (teamDuels ?? []).filter((d) => d.status === "active");
  const finished = (teamDuels ?? []).filter((d) => d.status === "completed" || d.status === "declined");

  return (
    <section className="rounded-lg border border-sky-300 bg-sky-50 p-6 dark:border-sky-800 dark:bg-sky-950/30">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">🏳️ チーム対戦</h2>
        <button
          onClick={() => setFormOpen((v) => !v)}
          className="rounded-full bg-sky-600 px-3 py-1 text-xs text-white hover:bg-sky-700"
        >
          他チームに申し込む
        </button>
      </div>

      {formOpen && (
        <div className="mb-4 flex flex-col gap-3 rounded-md bg-white p-3 dark:bg-zinc-900">
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">
            相手チームの招待コード
            <input
              value={opponentInviteCode}
              onChange={(e) => setOpponentInviteCode(e.target.value)}
              placeholder="例:AB23CD45"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <div>
            <p className="mb-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">対戦期間</p>
            <div className="flex gap-2">
              {[3, 7, 14].map((days) => (
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
              placeholder="例:負けたチームは勝ちチームに宣伝メッセージを送る"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <div className="flex gap-2">
            <button
              onClick={submitChallenge}
              disabled={submitting || !opponentInviteCode.trim()}
              className="rounded-full bg-sky-600 px-4 py-1.5 text-xs text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {submitting ? "申し込み中..." : "この内容で申し込む"}
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

      {incomingPending.map((d) => (
        <div key={d.id} className="mb-3 rounded-md bg-white px-4 py-2 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-800 dark:text-zinc-200">
              {d.opponentLabel}から{d.durationDays}日間のチーム対戦の申し込み
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => respond(d.id, true)}
                className="rounded-full bg-sky-600 px-3 py-1 text-xs text-white hover:bg-sky-700"
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
          {d.stakeDescription && (
            <p className="mt-1 text-xs text-zinc-500">賭けの内容:{d.stakeDescription}</p>
          )}
        </div>
      ))}

      {outgoingPending.map((d) => (
        <div key={d.id} className="mb-3 rounded-md bg-white px-4 py-2 text-sm text-zinc-500 dark:bg-zinc-900">
          {d.opponentLabel}への{d.durationDays}日間のチーム対戦申し込み、返答待ちです。
          {d.stakeDescription && <span className="block text-xs">賭けの内容:{d.stakeDescription}</span>}
        </div>
      ))}

      {active.map((d) => {
        const mine = d.myRatePercent ?? 0;
        const opp = d.opponentRatePercent ?? 0;
        return (
          <div key={d.id} className="mb-3 rounded-md bg-white px-4 py-3 dark:bg-zinc-900">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-zinc-900 dark:text-zinc-50">vs {d.opponentLabel}</span>
              <span className="text-xs text-zinc-500">残り{daysRemaining(d.endsAt)}日</span>
            </div>
            {d.stakeDescription && (
              <p className="mb-2 text-xs text-zinc-500">賭けの内容:{d.stakeDescription}</p>
            )}
            <div className="flex items-center gap-2 text-xs">
              <span className="w-24 flex-shrink-0 tabular-nums text-zinc-600 dark:text-zinc-300">
                自チーム平均 {mine.toFixed(1)}%
              </span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <span className="block h-full bg-sky-600" style={{ width: `${barWidth(mine)}%` }} />
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs">
              <span className="w-24 flex-shrink-0 tabular-nums text-zinc-600 dark:text-zinc-300">
                相手平均 {opp.toFixed(1)}%
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
          <summary className="cursor-pointer select-none font-medium">過去のチーム対戦結果</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {finished.map((d) => (
              <li key={d.id}>
                vs {d.opponentLabel}:{" "}
                {d.status === "declined"
                  ? "辞退されました"
                  : d.isWinner === null
                    ? "引き分け"
                    : d.isWinner
                      ? "勝利"
                      : "敗北"}
                {d.myRatePercent != null && d.opponentRatePercent != null
                  ? ` (${d.myRatePercent.toFixed(1)}% vs ${d.opponentRatePercent.toFixed(1)}%)`
                  : ""}
                {d.stakeDescription ? `・賭け:${d.stakeDescription}` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}

      {(teamDuels ?? []).length === 0 && !formOpen && (
        <p className="text-xs text-zinc-500">
          他チームの招待コードを知っていれば、チーム対抗の対戦を申し込めます。
        </p>
      )}
    </section>
  );
}
