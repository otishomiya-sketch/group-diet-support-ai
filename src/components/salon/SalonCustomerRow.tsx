"use client";

import { useState } from "react";

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

interface SalonCustomer {
  userId: string;
  displayName: string;
  achievementRate: number;
}

interface SalonCustomerRowProps {
  customer: SalonCustomer;
  /** "/api/salon"(スタッフ用・自分のサロン)または"/api/admin/salon/{id}"(運営用・任意サロン)。 */
  apiBasePath?: string;
}

export function SalonCustomerRow({ customer, apiBasePath = "/api/salon" }: SalonCustomerRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<string | null>(null);

  async function toggle() {
    if (!expanded && !data && !loading) {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`${apiBasePath}/customer/${customer.userId}/activity`);
        const json = await res.json();
        if (!res.ok) {
          setLoadError(json.error ?? "読み込みに失敗しました。");
        } else {
          setData(json);
        }
      } finally {
        setLoading(false);
      }
    }
    setExpanded((v) => !v);
  }

  async function sendMessage() {
    setSending(true);
    setSendStatus(null);
    const res = await fetch(`${apiBasePath}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerUserId: customer.userId, text: messageText }),
    });
    const json = await res.json();
    setSendStatus(res.ok ? "送信しました。" : (json.error ?? "送信に失敗しました。"));
    setSending(false);
    if (res.ok) {
      setMessageText("");
      setMessageOpen(false);
    }
  }

  return (
    <li className="overflow-hidden rounded-2xl border border-salon-border bg-salon-surface shadow-sm shadow-salon-accent/5">
      <div className="flex w-full items-center justify-between px-4 py-3">
        <span className="font-salon-display text-lg text-salon-heading">{customer.displayName}</span>
        <span className="flex items-center gap-3">
          <span className="text-xs tabular-nums text-salon-muted">
            達成率 {customer.achievementRate}%
          </span>
          <button
            onClick={() => setMessageOpen((v) => !v)}
            className="rounded-full bg-salon-accent-strong px-3 py-1 text-xs text-salon-on-strong hover:bg-salon-accent-hover"
          >
            メッセージを送る
          </button>
          <button
            onClick={toggle}
            className="text-xs text-salon-muted hover:text-salon-heading"
          >
            {expanded ? "閉じる ▲" : "記録を見る ▼"}
          </button>
        </span>
      </div>

      {messageOpen && (
        <div className="flex flex-col gap-2 border-t border-salon-border bg-salon-accent-soft/40 px-4 py-3">
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="顧客に送るメッセージを入力"
            className="rounded-md border border-salon-border bg-salon-surface px-3 py-2 text-sm text-salon-ink"
          />
          <div className="flex gap-2">
            <button
              onClick={sendMessage}
              disabled={sending || !messageText.trim()}
              className="rounded-full bg-salon-accent-strong px-4 py-1.5 text-xs text-salon-on-strong hover:bg-salon-accent-hover disabled:opacity-50"
            >
              {sending ? "送信中..." : "LINEで送信"}
            </button>
            <button
              onClick={() => setMessageOpen(false)}
              className="rounded-full border border-salon-border px-4 py-1.5 text-xs text-salon-ink hover:bg-salon-accent-soft"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {sendStatus && (
        <p className="border-t border-salon-border px-4 py-2 text-xs text-salon-muted">{sendStatus}</p>
      )}

      {expanded && (
        <div className="border-t border-salon-border px-4 py-4">
          {loading && <p className="text-sm text-salon-muted">読み込み中...</p>}
          {loadError && <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>}
          {data && (
            <>
              <h3 className="mb-2 text-sm font-semibold text-salon-heading">体重の推移(直近30日)</h3>
              <WeightTrendChart points={data.weightTrend} emptyMessage="まだ体重の記録がありません。" />

              <h3 className="mb-2 mt-4 text-sm font-semibold text-salon-heading">
                食事の記録(直近30日)
              </h3>
              {data.meals.length === 0 ? (
                <p className="text-sm text-salon-muted">まだ食事の記録がありません。</p>
              ) : (
                <ul className="flex max-h-80 flex-col gap-3 overflow-y-auto">
                  {data.meals.map((meal) => (
                    <li
                      key={meal.id}
                      className="flex gap-3 rounded-md bg-salon-accent-soft/50 p-2"
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
                        <span className="text-salon-ink">{meal.foodDescription ?? "(内容不明)"}</span>
                        <span className="text-salon-muted">
                          {meal.estimatedCalories != null
                            ? `推定 ${meal.estimatedCalories}kcal`
                            : "カロリー推定なし"}
                        </span>
                        <span className="text-xs text-salon-muted">
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
