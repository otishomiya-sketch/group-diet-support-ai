"use client";

import { useEffect, useState } from "react";

const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

interface StepRecord {
  id: string;
  date: string;
  stepCount: number;
  source: string;
}

interface ThresholdSetting {
  heartRateUpperBound: number | null;
  heartRateLowerBound: number | null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function VitalsPage() {
  const [steps, setSteps] = useState<StepRecord[]>([]);
  const [threshold, setThreshold] = useState<ThresholdSetting>({
    heartRateUpperBound: null,
    heartRateLowerBound: null,
  });
  const [saved, setSaved] = useState(false);
  const [manualDate, setManualDate] = useState(todayIso());
  const [manualSteps, setManualSteps] = useState("");
  const [stepSaved, setStepSaved] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch("/api/vitals/steps")
      .then((res) => res.json())
      .then((data) => setSteps(data.records ?? []));
  }, [refreshKey]);

  useEffect(() => {
    fetch("/api/vitals/threshold-settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.setting) setThreshold(data.setting);
      });
  }, []);

  async function saveThreshold(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    await fetch("/api/vitals/threshold-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(threshold),
    });
    setSaved(true);
  }

  async function saveManualSteps(e: React.FormEvent) {
    e.preventDefault();
    setStepSaved(false);
    await fetch("/api/vitals/steps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: manualDate, stepCount: Number(manualSteps), source: "manual" }),
    });
    setManualSteps("");
    setStepSaved(true);
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-6 py-16">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">バイタル・活動量</h1>

      <section className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">歩数(直近30日)</h2>
        <p className="mb-4 text-sm text-zinc-500">
          HealthKit(iPhone)との自動連携には専用のネイティブアプリが必要で、このWeb版アプリだけでは
          直接同期できません。現時点では下記の手動入力のみ対応しています。
        </p>

        {steps.length === 0 ? (
          <p className="mb-4 text-sm text-zinc-500">まだ記録がありません。</p>
        ) : (
          <ul className="mb-4 flex flex-col gap-1 text-sm">
            {steps.map((s) => (
              <li key={s.id} className="flex justify-between">
                <span>{new Date(s.date).toLocaleDateString("ja-JP")}</span>
                <span>
                  {s.stepCount.toLocaleString()} 歩
                  <span className="ml-2 text-xs text-zinc-400">({s.source})</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        {stepSaved && <p className="mb-3 text-sm text-green-600 dark:text-green-400">記録しました。</p>}
        <form onSubmit={saveManualSteps} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            日付
            <input
              className={inputClass}
              type="date"
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            歩数
            <input
              className={inputClass}
              type="number"
              min="0"
              value={manualSteps}
              onChange={(e) => setManualSteps(e.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-zinc-900 px-5 py-2 text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-black"
          >
            記録
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">心拍数の閾値設定</h2>
        <p className="mb-4 text-sm text-zinc-500">
          設定した数値を超過/下回った場合、事実のみを通知します(判定・診断は行いません)。
        </p>
        {saved && <p className="mb-3 text-sm text-green-600 dark:text-green-400">保存しました。</p>}
        <form onSubmit={saveThreshold} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            上限(bpm)
            <input
              className={inputClass}
              type="number"
              value={threshold.heartRateUpperBound ?? ""}
              onChange={(e) =>
                setThreshold((prev) => ({
                  ...prev,
                  heartRateUpperBound: e.target.value ? Number(e.target.value) : null,
                }))
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            下限(bpm)
            <input
              className={inputClass}
              type="number"
              value={threshold.heartRateLowerBound ?? ""}
              onChange={(e) =>
                setThreshold((prev) => ({
                  ...prev,
                  heartRateLowerBound: e.target.value ? Number(e.target.value) : null,
                }))
              }
            />
          </label>
          <button
            type="submit"
            className="self-start rounded-full bg-zinc-900 px-5 py-2 text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-black"
          >
            保存
          </button>
        </form>
      </section>
    </div>
  );
}
