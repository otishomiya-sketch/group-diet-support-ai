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

interface Template {
  id: string;
  scene: string;
  title: string;
  body: string;
}

interface Ticket {
  id: string;
  name: string;
  totalSessions: number | null;
  remainingSessions: number | null;
  totalAmount: number | null;
  remainingAmount: number | null;
  pricePerSession: number | null;
  status: string;
  expiresAt: string | null;
}

const TICKET_STATUS_LABEL: Record<string, string> = {
  active: "利用可能",
  used_up: "使い切り",
  expired: "期限切れ",
  cancelled: "キャンセル済み",
};

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
  const [templates, setTemplates] = useState<Template[] | null>(null);

  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [ticketFormOpen, setTicketFormOpen] = useState(false);
  const [ticketName, setTicketName] = useState("");
  const [ticketMode, setTicketMode] = useState<"sessions" | "amount" | "both">("sessions");
  const [ticketSessions, setTicketSessions] = useState(10);
  const [ticketAmount, setTicketAmount] = useState(100000);
  const [ticketPricePerSession, setTicketPricePerSession] = useState(10000);
  const [ticketExpiresAt, setTicketExpiresAt] = useState("");
  const [ticketNote, setTicketNote] = useState("");
  const [issuingTicket, setIssuingTicket] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);

  function loadTickets() {
    fetch(`${apiBasePath}/customer/${customer.userId}/tickets`)
      .then((res) => res.json())
      .then((json) => setTickets(json.tickets ?? []))
      .catch(() => setTickets([]));
  }

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
      loadTickets();
    }
    setExpanded((v) => !v);
  }

  async function issueTicket() {
    setIssuingTicket(true);
    setTicketError(null);
    const res = await fetch(`${apiBasePath}/customer/${customer.userId}/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: ticketName,
        totalSessions: ticketMode !== "amount" ? ticketSessions : null,
        totalAmount: ticketMode !== "sessions" ? ticketAmount : null,
        pricePerSession: ticketMode !== "sessions" ? ticketPricePerSession : null,
        expiresAt: ticketExpiresAt || null,
        note: ticketNote.trim() || null,
      }),
    });
    const json = await res.json();
    setIssuingTicket(false);
    if (!res.ok) {
      setTicketError(json.error ?? "チケットの発行に失敗しました。");
      return;
    }
    setTicketName("");
    setTicketNote("");
    setTicketFormOpen(false);
    loadTickets();
  }

  async function cancelTicket(ticketId: string) {
    await fetch(`${apiBasePath}/tickets/${ticketId}`, { method: "DELETE" });
    loadTickets();
  }

  async function openMessagePanel() {
    if (!messageOpen && templates === null) {
      fetch(`${apiBasePath}/templates`)
        .then((res) => res.json())
        .then((json) => setTemplates(json.templates ?? []))
        .catch(() => setTemplates([]));
    }
    setMessageOpen((v) => !v);
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
            onClick={openMessagePanel}
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
          {templates && templates.length > 0 && (
            <select
              defaultValue=""
              onChange={(e) => {
                const template = templates.find((t) => t.id === e.target.value);
                if (template) setMessageText(template.body);
                e.target.value = "";
              }}
              className="rounded-md border border-salon-border bg-salon-surface px-3 py-1.5 text-sm text-salon-ink"
            >
              <option value="" disabled>
                テンプレートから選ぶ(任意)
              </option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          )}
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

              <div className="mb-2 mt-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-salon-heading">🎫 施術チケット</h3>
                <button
                  onClick={() => setTicketFormOpen((v) => !v)}
                  className="rounded-full border border-salon-gold px-3 py-1 text-xs text-salon-gold-strong hover:bg-salon-gold-soft"
                >
                  + チケットを発行
                </button>
              </div>

              {ticketFormOpen && (
                <div className="mb-3 flex flex-col gap-2 rounded-xl bg-salon-gold-soft/40 p-3">
                  <input
                    value={ticketName}
                    onChange={(e) => setTicketName(e.target.value)}
                    placeholder="チケット名(例:フェイシャル10回パック)"
                    className="rounded-md border border-salon-border bg-salon-surface px-3 py-1.5 text-sm text-salon-ink"
                  />
                  <div className="flex gap-1.5">
                    {(
                      [
                        ["sessions", "回数券"],
                        ["amount", "前受金(金額)"],
                        ["both", "回数+金額"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => setTicketMode(value)}
                        className={
                          ticketMode === value
                            ? "rounded-full bg-salon-gold-strong px-3 py-1 text-xs text-salon-on-strong"
                            : "rounded-full border border-salon-border px-3 py-1 text-xs text-salon-ink hover:bg-salon-gold-soft"
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {ticketMode !== "amount" && (
                    <label className="flex flex-col gap-1 text-xs font-medium text-salon-muted">
                      回数
                      <input
                        type="number"
                        min={1}
                        value={ticketSessions}
                        onChange={(e) => setTicketSessions(Number(e.target.value))}
                        className="rounded-md border border-salon-border bg-salon-surface px-3 py-1.5 text-sm font-normal text-salon-ink"
                      />
                    </label>
                  )}
                  {ticketMode !== "sessions" && (
                    <>
                      <label className="flex flex-col gap-1 text-xs font-medium text-salon-muted">
                        前受金総額(円)
                        <input
                          type="number"
                          min={1}
                          value={ticketAmount}
                          onChange={(e) => setTicketAmount(Number(e.target.value))}
                          className="rounded-md border border-salon-border bg-salon-surface px-3 py-1.5 text-sm font-normal text-salon-ink"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs font-medium text-salon-muted">
                        1回あたりの消化金額(円)
                        <input
                          type="number"
                          min={1}
                          value={ticketPricePerSession}
                          onChange={(e) => setTicketPricePerSession(Number(e.target.value))}
                          className="rounded-md border border-salon-border bg-salon-surface px-3 py-1.5 text-sm font-normal text-salon-ink"
                        />
                      </label>
                    </>
                  )}
                  <label className="flex flex-col gap-1 text-xs font-medium text-salon-muted">
                    有効期限(任意)
                    <input
                      type="date"
                      value={ticketExpiresAt}
                      onChange={(e) => setTicketExpiresAt(e.target.value)}
                      className="rounded-md border border-salon-border bg-salon-surface px-3 py-1.5 text-sm font-normal text-salon-ink"
                    />
                  </label>
                  <input
                    value={ticketNote}
                    onChange={(e) => setTicketNote(e.target.value)}
                    placeholder="メモ(任意)"
                    className="rounded-md border border-salon-border bg-salon-surface px-3 py-1.5 text-sm text-salon-ink"
                  />
                  <p className="text-xs text-salon-muted">
                    ※ 入金はスタッフが店頭で受け取ったうえで発行してください(オンライン決済は扱いません)。
                  </p>
                  {ticketError && <p className="text-xs text-red-600 dark:text-red-400">{ticketError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={issueTicket}
                      disabled={issuingTicket || !ticketName.trim()}
                      className="rounded-full bg-salon-gold-strong px-4 py-1.5 text-xs text-salon-on-strong hover:bg-salon-gold-hover disabled:opacity-50"
                    >
                      {issuingTicket ? "発行中..." : "発行する"}
                    </button>
                    <button
                      onClick={() => setTicketFormOpen(false)}
                      className="rounded-full border border-salon-border px-4 py-1.5 text-xs text-salon-ink hover:bg-salon-gold-soft"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}

              <ul className="flex flex-col gap-2">
                {(tickets ?? []).map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between rounded-md bg-salon-gold-soft/50 px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium text-salon-heading">{t.name}</span>
                      <span className="ml-2 text-xs text-salon-muted">
                        {t.remainingSessions != null && `残${t.remainingSessions}/${t.totalSessions}回`}
                        {t.remainingSessions != null && t.remainingAmount != null && " ・ "}
                        {t.remainingAmount != null &&
                          `残高¥${t.remainingAmount.toLocaleString()}/${t.totalAmount?.toLocaleString()}`}
                      </span>
                      <span className="ml-2 text-xs text-salon-muted">
                        {TICKET_STATUS_LABEL[t.status] ?? t.status}
                      </span>
                    </div>
                    {t.status === "active" && (
                      <button
                        onClick={() => cancelTicket(t.id)}
                        className="text-xs text-red-500 hover:text-red-600"
                      >
                        取消
                      </button>
                    )}
                  </li>
                ))}
                {tickets && tickets.length === 0 && (
                  <p className="text-sm text-salon-muted">まだチケットが発行されていません。</p>
                )}
              </ul>
            </>
          )}
        </div>
      )}
    </li>
  );
}
