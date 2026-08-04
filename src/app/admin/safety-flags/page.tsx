"use client";

import { useEffect, useState } from "react";

interface SafetyFlag {
  id: string;
  flagType: string;
  detectedAt: string;
  actionTaken: string | null;
  user: { id: string; displayName: string; email: string };
}

export default function AdminSafetyFlagsPage() {
  const [flags, setFlags] = useState<SafetyFlag[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    fetch("/api/admin/safety-flags")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (ignore) return;
        if (!res.ok) {
          setError(data.error ?? "取得に失敗しました。");
          return;
        }
        setFlags(data.flags);
      })
      .catch(() => {
        if (!ignore) setError("通信エラーが発生しました。");
      });

    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  async function resolve(id: string) {
    await fetch(`/api/admin/safety-flags/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionTaken: "no_action_needed" }),
    });
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">安全レイヤー検知一覧(運営専用)</h1>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {flags && flags.length === 0 && <p className="text-zinc-500">未対応の検知はありません。</p>}
      <ul className="flex flex-col gap-3">
        {flags?.map((f) => (
          <li
            key={f.id}
            className="flex items-center justify-between rounded-md border border-zinc-200 px-4 py-3 dark:border-zinc-800"
          >
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-50">{f.flagType}</p>
              <p className="text-sm text-zinc-500">
                {f.user.displayName}({f.user.email}) / {new Date(f.detectedAt).toLocaleString("ja-JP")}
              </p>
              <p className="text-sm text-zinc-500">actionTaken: {f.actionTaken ?? "-"}</p>
            </div>
            <button
              onClick={() => resolve(f.id)}
              className="rounded-full border border-zinc-300 px-4 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              対応完了にする
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
