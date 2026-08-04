"use client";

import { useEffect, useState } from "react";

interface DashboardData {
  totalReferred: number;
  conversionRate: number;
  retentionRate: number;
}

export default function AgencyDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/agency/dashboard")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "取得に失敗しました。");
          return;
        }
        setData(json);
      })
      .catch(() => setError("通信エラーが発生しました。"));
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">代理店ダッシュボード</h1>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {data && (
        <dl className="grid grid-cols-2 gap-y-4 rounded-lg border border-zinc-200 p-6 text-sm dark:border-zinc-800">
          <dt className="text-zinc-500">紹介経由登録者数</dt>
          <dd className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{data.totalReferred}</dd>
          <dt className="text-zinc-500">課金移行率</dt>
          <dd className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {(data.conversionRate * 100).toFixed(1)}%
          </dd>
          <dt className="text-zinc-500">継続率</dt>
          <dd className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {(data.retentionRate * 100).toFixed(1)}%
          </dd>
        </dl>
      )}
    </div>
  );
}
