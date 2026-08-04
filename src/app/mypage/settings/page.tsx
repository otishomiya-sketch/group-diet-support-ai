"use client";

import { useEffect, useState } from "react";

const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

interface Settings {
  bmiDisplayOptIn: boolean;
  weightShareOptOut: boolean;
  weightReportFrequency: string;
  notifyScheduled: boolean;
  notifyTeamShare: boolean;
  notifyIndividualSupport: boolean;
}

export default function MyPageSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/mypage/settings")
      .then((res) => res.json())
      .then((data) => setSettings(data.settings));
    fetch("/api/line/link-code")
      .then((res) => res.json())
      .then((data) => setLinkCode(data.linkCode))
      .catch(() => {});
  }, []);

  async function save(patch: Partial<Settings>) {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    setSaved(false);
    await fetch("/api/mypage/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSaved(true);
  }

  if (!settings) {
    return <div className="px-6 py-16 text-zinc-500">読み込み中...</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">設定</h1>
      {saved && <p className="text-sm text-green-600 dark:text-green-400">保存しました。</p>}

      <section className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">表示・共有</h2>

        <label className="flex items-center justify-between gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          BMIを表示する
          <input
            type="checkbox"
            checked={settings.bmiDisplayOptIn}
            onChange={(e) => save({ bmiDisplayOptIn: e.target.checked })}
          />
        </label>

        <label className="flex items-center justify-between gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          自分の体重減少をチームに共有しない
          <input
            type="checkbox"
            checked={settings.weightShareOptOut}
            onChange={(e) => save({ weightShareOptOut: e.target.checked })}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          体重報告の頻度
          <select
            className={inputClass}
            value={settings.weightReportFrequency}
            onChange={(e) => save({ weightReportFrequency: e.target.value })}
          >
            <option value="daily">毎日</option>
            <option value="every_2_3_days">2〜3日に1回</option>
            <option value="weekly">週1回</option>
          </select>
        </label>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">通知</h2>

        <label className="flex items-center justify-between gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          定時配信
          <input
            type="checkbox"
            checked={settings.notifyScheduled}
            onChange={(e) => save({ notifyScheduled: e.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          チーム共有通知
          <input
            type="checkbox"
            checked={settings.notifyTeamShare}
            onChange={(e) => save({ notifyTeamShare: e.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          個別行動支援通知
          <input
            type="checkbox"
            checked={settings.notifyIndividualSupport}
            onChange={(e) => save({ notifyIndividualSupport: e.target.checked })}
          />
        </label>
      </section>

      <section className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">LINE連携</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          LINE公式アカウントのトークに、以下のコードをそのまま送信してください。
        </p>
        {linkCode && (
          <code className="rounded bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900">{linkCode}</code>
        )}
      </section>
    </div>
  );
}
