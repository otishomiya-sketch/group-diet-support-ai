"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface SalonStaff {
  userId: string;
  displayName: string;
  email: string;
}

interface Salon {
  id: string;
  name: string;
  customerInviteCode: string;
  createdAt: string;
  staff: SalonStaff[];
  customerCount: number;
}

const inputClass =
  "w-full rounded-md border border-salon-border bg-salon-surface px-3 py-2 text-sm text-salon-ink";

export default function AdminSalonPage() {
  const [salons, setSalons] = useState<Salon[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [newSalonName, setNewSalonName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [staffEmailBySalon, setStaffEmailBySalon] = useState<Record<string, string>>({});
  const [addingStaffFor, setAddingStaffFor] = useState<string | null>(null);
  const [staffErrorBySalon, setStaffErrorBySalon] = useState<Record<string, string>>({});
  const [copiedSalonId, setCopiedSalonId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    fetch("/api/admin/salon")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (ignore) return;
        if (!res.ok) {
          setError(data.error ?? "取得に失敗しました。");
          return;
        }
        setSalons(data.salons);
      })
      .catch(() => {
        if (!ignore) setError("通信エラーが発生しました。");
      });
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  async function createSalon(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    const res = await fetch("/api/admin/salon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newSalonName }),
    });
    const json = await res.json();
    setCreating(false);
    if (!res.ok) {
      setCreateError(json.error ?? "作成に失敗しました。");
      return;
    }
    setNewSalonName("");
    setRefreshKey((k) => k + 1);
  }

  async function addStaff(salonId: string) {
    const email = staffEmailBySalon[salonId]?.trim();
    if (!email) return;
    setAddingStaffFor(salonId);
    setStaffErrorBySalon((prev) => ({ ...prev, [salonId]: "" }));
    const res = await fetch("/api/admin/salon/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salonId, email }),
    });
    const json = await res.json();
    setAddingStaffFor(null);
    if (!res.ok) {
      setStaffErrorBySalon((prev) => ({ ...prev, [salonId]: json.error ?? "追加に失敗しました。" }));
      return;
    }
    setStaffEmailBySalon((prev) => ({ ...prev, [salonId]: "" }));
    setRefreshKey((k) => k + 1);
  }

  async function removeStaff(salonId: string, userId: string) {
    await fetch("/api/admin/salon/staff", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salonId, userId }),
    });
    setRefreshKey((k) => k + 1);
  }

  function copyInviteLink(salon: Salon) {
    navigator.clipboard.writeText(`${window.location.origin}/register?salonCode=${salon.customerInviteCode}`);
    setCopiedSalonId(salon.id);
    setTimeout(() => setCopiedSalonId(null), 2000);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <div>
        <p className="mb-1 text-xs tracking-widest text-salon-gold uppercase">Operator Only</p>
        <h1 className="font-salon-display text-3xl font-semibold text-salon-heading">サロン管理</h1>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <section className="rounded-2xl border border-salon-border bg-salon-surface p-6 shadow-sm shadow-salon-accent/5">
        <h2 className="font-salon-display mb-3 text-xl font-semibold text-salon-heading">
          新しいサロンを作成
        </h2>
        <form onSubmit={createSalon} className="flex gap-3">
          <input
            className={inputClass}
            placeholder="サロン名(例:○○エステ渋谷店)"
            value={newSalonName}
            onChange={(e) => setNewSalonName(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={creating}
            className="whitespace-nowrap rounded-full bg-salon-accent-strong px-5 py-2 text-sm text-salon-on-strong hover:bg-salon-accent-hover disabled:opacity-50"
          >
            {creating ? "作成中..." : "作成する"}
          </button>
        </form>
        {createError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{createError}</p>}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-salon-display text-xl font-semibold text-salon-heading">サロン一覧</h2>
        {salons && salons.length === 0 && <p className="text-salon-muted">まだサロンがありません。</p>}
        {salons?.map((salon) => (
          <div
            key={salon.id}
            className="rounded-2xl border border-salon-border bg-salon-surface p-6 shadow-sm shadow-salon-accent/5"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-salon-display text-lg font-semibold text-salon-heading">
                {salon.name}
              </h3>
              <span className="text-xs text-salon-muted">顧客数 {salon.customerCount}名</span>
            </div>

            <Link
              href={`/admin/salon/${salon.id}`}
              className="mb-4 inline-flex w-fit items-center gap-1 rounded-full bg-salon-accent-strong px-4 py-1.5 text-xs text-salon-on-strong hover:bg-salon-accent-hover"
            >
              顧客管理を開く
            </Link>

            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
              <code className="rounded-full bg-salon-accent-soft px-3 py-1 tracking-wider text-salon-heading">
                {salon.customerInviteCode}
              </code>
              <button
                onClick={() => copyInviteLink(salon)}
                className="rounded-full border border-salon-border px-3 py-1 text-xs text-salon-ink hover:bg-salon-accent-soft"
              >
                {copiedSalonId === salon.id ? "コピーしました" : "顧客用招待リンクをコピー"}
              </button>
            </div>

            <p className="mb-1 text-xs font-medium text-salon-muted">スタッフ</p>
            <ul className="mb-3 flex flex-col gap-1">
              {salon.staff.map((s) => (
                <li
                  key={s.userId}
                  className="flex items-center justify-between rounded-md bg-salon-accent-soft/50 px-3 py-1.5 text-sm text-salon-ink"
                >
                  <span>
                    {s.displayName}({s.email})
                  </span>
                  <button
                    onClick={() => removeStaff(salon.id, s.userId)}
                    className="text-xs text-red-500 hover:text-red-600"
                  >
                    削除
                  </button>
                </li>
              ))}
              {salon.staff.length === 0 && (
                <li className="text-xs text-salon-muted">まだスタッフがいません。</li>
              )}
            </ul>

            <div className="flex gap-2">
              <input
                className={inputClass}
                type="email"
                placeholder="スタッフとして追加するアカウントのメールアドレス"
                value={staffEmailBySalon[salon.id] ?? ""}
                onChange={(e) =>
                  setStaffEmailBySalon((prev) => ({ ...prev, [salon.id]: e.target.value }))
                }
              />
              <button
                onClick={() => addStaff(salon.id)}
                disabled={addingStaffFor === salon.id}
                className="whitespace-nowrap rounded-full border border-salon-border px-4 py-2 text-sm text-salon-ink hover:bg-salon-accent-soft disabled:opacity-50"
              >
                追加
              </button>
            </div>
            {staffErrorBySalon[salon.id] && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{staffErrorBySalon[salon.id]}</p>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
