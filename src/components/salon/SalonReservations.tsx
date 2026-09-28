"use client";

import { useEffect, useState } from "react";

interface SalonCustomer {
  userId: string;
  displayName: string;
}

interface Reservation {
  id: string;
  customerUserId: string;
  customerDisplayName: string;
  menuName: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  note: string | null;
}

interface Ticket {
  id: string;
  name: string;
  remainingSessions: number | null;
  remainingAmount: number | null;
  status: string;
}

interface SalonReservationsProps {
  customers: SalonCustomer[];
  /** "/api/salon"(スタッフ用・自分のサロン)または"/api/admin/salon/{id}"(運営用・任意サロン)。 */
  apiBasePath?: string;
}

function todayDateInputValue(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: "予定",
  completed: "完了",
  cancelled: "キャンセル",
};

export function SalonReservations({ customers, apiBasePath = "/api/salon" }: SalonReservationsProps) {
  const [date, setDate] = useState(todayDateInputValue());
  const [reservations, setReservations] = useState<Reservation[] | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formMenuName, setFormMenuName] = useState("");
  const [formTime, setFormTime] = useState("10:00");
  const [formDuration, setFormDuration] = useState(60);
  const [formNote, setFormNote] = useState("");
  const [creating, setCreating] = useState(false);

  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completingTickets, setCompletingTickets] = useState<Ticket[] | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string>("");

  useEffect(() => {
    let ignore = false;
    fetch(`${apiBasePath}/reservations?date=${date}`)
      .then(async (res) => {
        const json = await res.json();
        if (ignore) return;
        if (!res.ok) {
          setError(json.error ?? "取得に失敗しました。");
          return;
        }
        setReservations(json.reservations);
      })
      .catch(() => {
        if (!ignore) setError("通信エラーが発生しました。");
      });
    return () => {
      ignore = true;
    };
  }, [apiBasePath, date, refreshKey]);

  async function createReservation() {
    setCreating(true);
    setError(null);
    const scheduledAt = new Date(`${date}T${formTime}:00`);
    const res = await fetch(`${apiBasePath}/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerUserId: formCustomerId,
        menuName: formMenuName,
        scheduledAt: scheduledAt.toISOString(),
        durationMinutes: formDuration,
        note: formNote.trim() || null,
      }),
    });
    const json = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(json.error ?? "予約の登録に失敗しました。");
      return;
    }
    setFormOpen(false);
    setFormCustomerId("");
    setFormMenuName("");
    setFormNote("");
    setRefreshKey((k) => k + 1);
  }

  async function startCompleting(reservation: Reservation) {
    setCompletingId(reservation.id);
    setSelectedTicketId("");
    const res = await fetch(`${apiBasePath}/customer/${reservation.customerUserId}/tickets`);
    const json = await res.json();
    const active = ((json.tickets ?? []) as Ticket[]).filter((t) => t.status === "active");
    setCompletingTickets(active);
  }

  async function confirmComplete(reservationId: string) {
    const res = await fetch(`${apiBasePath}/reservations/${reservationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", ticketId: selectedTicketId || null }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "完了処理に失敗しました。");
      return;
    }
    setCompletingId(null);
    setCompletingTickets(null);
    setRefreshKey((k) => k + 1);
  }

  async function cancelReservation(reservationId: string) {
    const res = await fetch(`${apiBasePath}/reservations/${reservationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "キャンセル処理に失敗しました。");
      return;
    }
    setRefreshKey((k) => k + 1);
  }

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <section className="rounded-2xl border border-salon-border bg-salon-surface p-6 shadow-sm shadow-salon-accent/5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-salon-display text-xl font-semibold text-salon-heading">📅 予約管理</h2>
        <button
          onClick={() => setFormOpen((v) => !v)}
          className="rounded-full border border-salon-accent px-3 py-1 text-xs text-salon-accent-strong hover:bg-salon-accent-soft"
        >
          + 予約を追加
        </button>
      </div>

      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="mb-3 rounded-md border border-salon-border bg-salon-surface px-3 py-1.5 text-sm text-salon-ink"
      />

      {formOpen && (
        <div className="mb-4 flex flex-col gap-2 rounded-xl bg-salon-accent-soft/40 p-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-salon-muted">
            顧客
            <select
              value={formCustomerId}
              onChange={(e) => setFormCustomerId(e.target.value)}
              className="rounded-md border border-salon-border bg-salon-surface px-3 py-1.5 text-sm font-normal text-salon-ink"
            >
              <option value="" disabled>
                選択してください
              </option>
              {customers.map((c) => (
                <option key={c.userId} value={c.userId}>
                  {c.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-salon-muted">
            メニュー
            <input
              value={formMenuName}
              onChange={(e) => setFormMenuName(e.target.value)}
              placeholder="例:フェイシャルエステ"
              className="rounded-md border border-salon-border bg-salon-surface px-3 py-1.5 text-sm font-normal text-salon-ink"
            />
          </label>
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-salon-muted">
              時刻
              <input
                type="time"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
                className="rounded-md border border-salon-border bg-salon-surface px-3 py-1.5 text-sm font-normal text-salon-ink"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-salon-muted">
              所要時間(分)
              <input
                type="number"
                min={1}
                value={formDuration}
                onChange={(e) => setFormDuration(Number(e.target.value))}
                className="rounded-md border border-salon-border bg-salon-surface px-3 py-1.5 text-sm font-normal text-salon-ink"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs font-medium text-salon-muted">
            メモ(任意)
            <input
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              className="rounded-md border border-salon-border bg-salon-surface px-3 py-1.5 text-sm font-normal text-salon-ink"
            />
          </label>
          <div className="flex gap-2">
            <button
              onClick={createReservation}
              disabled={creating || !formCustomerId || !formMenuName.trim()}
              className="rounded-full bg-salon-accent-strong px-4 py-1.5 text-xs text-salon-on-strong hover:bg-salon-accent-hover disabled:opacity-50"
            >
              {creating ? "登録中..." : "登録する"}
            </button>
            <button
              onClick={() => setFormOpen(false)}
              className="rounded-full border border-salon-border px-4 py-1.5 text-xs text-salon-ink hover:bg-salon-accent-soft"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <ul className="flex flex-col gap-2">
        {(reservations ?? []).map((r) => (
          <li key={r.id} className="rounded-xl border border-salon-border bg-salon-accent-soft/30 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="mr-2 text-sm font-semibold tabular-nums text-salon-heading">
                  {formatTime(r.scheduledAt)}
                </span>
                <span className="text-sm text-salon-ink">{r.customerDisplayName}</span>
                <span className="ml-2 text-xs text-salon-muted">{r.menuName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-salon-muted">{STATUS_LABEL[r.status] ?? r.status}</span>
                {r.status === "scheduled" && (
                  <>
                    <button
                      onClick={() => startCompleting(r)}
                      className="rounded-full bg-salon-accent-strong px-3 py-1 text-xs text-salon-on-strong hover:bg-salon-accent-hover"
                    >
                      完了
                    </button>
                    <button
                      onClick={() => cancelReservation(r.id)}
                      className="rounded-full border border-salon-border px-3 py-1 text-xs text-salon-ink hover:bg-salon-accent-soft"
                    >
                      キャンセル
                    </button>
                  </>
                )}
              </div>
            </div>

            {completingId === r.id && (
              <div className="mt-3 flex flex-col gap-2 rounded-lg bg-salon-surface p-3">
                <label className="flex flex-col gap-1 text-xs font-medium text-salon-muted">
                  使用するチケット(任意)
                  <select
                    value={selectedTicketId}
                    onChange={(e) => setSelectedTicketId(e.target.value)}
                    className="rounded-md border border-salon-border bg-salon-surface px-3 py-1.5 text-sm font-normal text-salon-ink"
                  >
                    <option value="">チケットを使わない(都度払い)</option>
                    {(completingTickets ?? []).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.remainingSessions != null ? `(残${t.remainingSessions}回)` : ""}
                        {t.remainingAmount != null ? `(残高¥${t.remainingAmount.toLocaleString()})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => confirmComplete(r.id)}
                    className="rounded-full bg-salon-accent-strong px-4 py-1.5 text-xs text-salon-on-strong hover:bg-salon-accent-hover"
                  >
                    この内容で完了にする
                  </button>
                  <button
                    onClick={() => {
                      setCompletingId(null);
                      setCompletingTickets(null);
                    }}
                    className="rounded-full border border-salon-border px-4 py-1.5 text-xs text-salon-ink hover:bg-salon-accent-soft"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}

            {r.note && <p className="mt-1 text-xs text-salon-muted">{r.note}</p>}
          </li>
        ))}
        {reservations && reservations.length === 0 && (
          <p className="text-sm text-salon-muted">この日の予約はまだありません。</p>
        )}
      </ul>
    </section>
  );
}
