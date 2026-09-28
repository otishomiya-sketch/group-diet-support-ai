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
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

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
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">サロン管理(運営専用)</h1>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <section className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">新しいサロンを作成</h2>
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
            className="whitespace-nowrap rounded-full bg-zinc-900 px-5 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-black"
          >
            {creating ? "作成中..." : "作成する"}
          </button>
        </form>
        {createError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{createError}</p>}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">サロン一覧</h2>
        {salons && salons.length === 0 && <p className="text-zinc-500">まだサロンがありません。</p>}
        {salons?.map((salon) => (
          <div key={salon.id} className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{salon.name}</h3>
              <span className="text-xs text-zinc-500">顧客数 {salon.customerCount}名</span>
            </div>

            <Link
              href={`/admin/salon/${salon.id}`}
              className="mb-4 inline-flex w-fit items-center gap-1 rounded-full bg-sky-600 px-4 py-1.5 text-xs text-white hover:bg-sky-700"
            >
              顧客管理を開く
            </Link>

            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
              <code className="rounded bg-zinc-100 px-3 py-1 tracking-wider dark:bg-zinc-900">
                {salon.customerInviteCode}
              </code>
              <button
                onClick={() => copyInviteLink(salon)}
                className="rounded-full border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                {copiedSalonId === salon.id ? "コピーしました" : "顧客用招待リンクをコピー"}
              </button>
            </div>

            <p className="mb-1 text-xs font-medium text-zinc-500">スタッフ</p>
            <ul className="mb-3 flex flex-col gap-1">
              {salon.staff.map((s) => (
                <li
                  key={s.userId}
                  className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-1.5 text-sm dark:bg-zinc-900"
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
                <li className="text-xs text-zinc-500">まだスタッフがいません。</li>
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
                className="whitespace-nowrap rounded-full border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
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
