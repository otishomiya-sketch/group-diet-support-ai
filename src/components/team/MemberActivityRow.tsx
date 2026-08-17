"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

import { WeightTrendChart } from "@/components/charts/chart-kit";

interface MealItem {
  id: string;
  imageUrl: string | null;
  foodDescription: string | null;
  estimatedCalories: number | null;
  createdAt: string;
}

interface WeightPoint {
  date: string;
  weightKg: number;
}

interface ActivityData {
  weightTrend: WeightPoint[];
  meals: MealItem[];
}

interface TeamMember {
  userId: string;
  displayName: string;
  achievedToday: boolean;
  achievementRate: number;
}

// チーム内での活動公開方針(運営判断):体重推移・食事内容(写真含む)は
// weightShareOptOut設定に関わらずチームメンバー全員に表示する。
export function MemberActivityRow({ member }: { member: TeamMember }) {
  const { data: session } = useSession();
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challengeFormOpen, setChallengeFormOpen] = useState(false);
  const [durationDays, setDurationDays] = useState(7);
  const [stakeDescription, setStakeDescription] = useState("");
  const [challenging, setChallenging] = useState(false);
  const [challengeStatus, setChallengeStatus] = useState<string | null>(null);

  const isSelf = session?.user?.id === member.userId;

  async function challenge() {
    setChallenging(true);
    setChallengeStatus(null);
    const res = await fetch("/api/duel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        opponentUserId: member.userId,
        durationDays,
        stakeDescription: stakeDescription.trim() || null,
      }),
    });
    const json = await res.json();
    setChallengeStatus(res.ok ? "対戦を申し込みました!相手の承諾を待っています。" : (json.error ?? "申し込みに失敗しました。"));
    setChallenging(false);
    if (res.ok) {
      setChallengeFormOpen(false);
      setStakeDescription("");
    }
  }

  async function toggle() {
    if (!expanded && !data && !loading) {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/team/member/${member.userId}/activity`);
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "読み込みに失敗しました。");
        } else {
          setData(json);
        }
      } finally {
        setLoading(false);
      }
    }
    setExpanded((v) => !v);
  }

  return (
    <li className="rounded-md border border-zinc-200 dark:border-zinc-800">
      <div className="flex w-full items-center justify-between px-4 py-2">
        <span className="text-zinc-900 dark:text-zinc-50">{member.displayName}</span>
        <span className="flex items-center gap-3">
          <span className="text-xs tabular-nums text-zinc-500">
            達成率 {member.achievementRate}%
          </span>
          <span
            className={
              member.achievedToday
                ? "text-sm text-green-600 dark:text-green-400"
                : "text-sm text-zinc-400"
            }
          >
            {member.achievedToday ? "本日達成" : "未達成"}
          </span>
          {!isSelf && (
            <button
              onClick={() => setChallengeFormOpen((v) => !v)}
              className="rounded-full bg-orange-500 px-3 py-1 text-xs text-white hover:bg-orange-600"
            >
              ⚔️ 対戦を申し込む
            </button>
          )}
          <button
            onClick={toggle}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            {expanded ? "閉じる ▲" : "詳細を見る ▼"}
          </button>
        </span>
      </div>

      {challengeFormOpen && !isSelf && (
        <div className="flex flex-col gap-3 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
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
              placeholder="例:負けたらランチをおごる"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <div className="flex gap-2">
            <button
              onClick={challenge}
              disabled={challenging}
              className="rounded-full bg-orange-500 px-4 py-1.5 text-xs text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {challenging ? "申し込み中..." : "この内容で申し込む"}
            </button>
            <button
              onClick={() => setChallengeFormOpen(false)}
              className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {challengeStatus && (
        <p className="border-t border-zinc-200 px-4 py-2 text-xs text-zinc-500 dark:border-zinc-800">
          {challengeStatus}
        </p>
      )}

      {expanded && (
        <div className="border-t border-zinc-200 px-4 py-4 dark:border-zinc-800">
          {loading && <p className="text-sm text-zinc-400">読み込み中...</p>}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {data && (
            <>
              <h3 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                体重の推移(直近30日)
              </h3>
              <WeightTrendChart points={data.weightTrend} emptyMessage="まだ体重の記録がありません。" />

              <h3 className="mb-2 mt-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                食事の記録(直近30日)
              </h3>
              {data.meals.length === 0 ? (
                <p className="text-sm text-zinc-400">まだ食事の記録がありません。</p>
              ) : (
                <ul className="flex max-h-80 flex-col gap-3 overflow-y-auto">
                  {data.meals.map((meal) => (
                    <li
                      key={meal.id}
                      className="flex gap-3 rounded-md bg-zinc-50 p-2 dark:bg-zinc-900"
                    >
                      {meal.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={meal.imageUrl}
                          alt="食事の写真"
                          className="h-16 w-16 flex-shrink-0 rounded object-cover"
                        />
                      )}
                      <div className="flex flex-col text-sm">
                        <span className="text-zinc-800 dark:text-zinc-200">
                          {meal.foodDescription ?? "(内容不明)"}
                        </span>
                        <span className="text-zinc-500">
                          {meal.estimatedCalories != null
                            ? `推定 ${meal.estimatedCalories}kcal`
                            : "カロリー推定なし"}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {new Date(meal.createdAt).toLocaleString("ja-JP")}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
}
