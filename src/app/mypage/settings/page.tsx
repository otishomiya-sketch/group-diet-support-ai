"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

import { BackToDashboardLink } from "@/components/nav/BackToDashboardLink";

const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

interface Settings {
  bmiDisplayOptIn: boolean;
  weightShareOptOut: boolean;
  weightReportFrequency: string;
  notifyIndividualSupport: boolean;
}

export default function MyPageSettings() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [lineLinked, setLineLinked] = useState(false);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [addFriendUrl, setAddFriendUrl] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/mypage/settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data.settings);
        setLineLinked(data.lineLinked);
      });
    fetch("/api/line/link-code")
      .then((res) => res.json())
      .then((data) => {
        setLinkCode(data.linkCode);
        setAddFriendUrl(data.addFriendUrl);
      })
      .catch(() => {});
  }, []);

  function copyLinkCode() {
    if (!linkCode) return;
    navigator.clipboard.writeText(linkCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

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

  async function withdrawAccount() {
    if (
      !window.confirm(
        "本当に退会しますか?退会するとログインできなくなり、チームからも自動的に抜けます。この操作は取り消せません。",
      )
    ) {
      return;
    }
    setWithdrawing(true);
    setWithdrawError(null);
    const res = await fetch("/api/account/withdraw", { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setWithdrawError(data.error ?? "退会処理に失敗しました。");
      setWithdrawing(false);
      return;
    }
    await signOut({ redirect: false });
    router.push("/login");
  }

  if (!settings) {
    return <div className="px-6 py-16 text-zinc-500">読み込み中...</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-16">
      <BackToDashboardLink />
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
          個別行動支援通知
          <input
            type="checkbox"
            checked={settings.notifyIndividualSupport}
            onChange={(e) => save({ notifyIndividualSupport: e.target.checked })}
          />
        </label>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">LINE連携</h2>

        {lineLinked ? (
          <p className="rounded-md bg-green-50 px-4 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
            連携済みです。LINEで体重報告・食事画像の送信ができます。
          </p>
        ) : (
          <ol className="flex list-decimal flex-col gap-4 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
            <li>
              <p className="mb-2">まだLINE公式アカウントを友だち追加していない場合は、追加してください。</p>
              {addFriendUrl && (
                <a
                  href={addFriendUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-full bg-[#06C755] px-5 py-2 text-white hover:opacity-90"
                >
                  LINEで友だち追加
                </a>
              )}
            </li>
            <li>
              <p className="mb-2">
                友だち追加したら、LINEのトーク画面を開き、以下のコードを<strong>そのままコピーして送信</strong>
                してください。
              </p>
              {linkCode && (
                <div className="flex items-center gap-3">
                  <code className="rounded bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900">{linkCode}</code>
                  <button
                    onClick={copyLinkCode}
                    className="rounded-full border border-zinc-300 px-4 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                  >
                    {codeCopied ? "コピーしました" : "コピー"}
                  </button>
                </div>
              )}
            </li>
            <li>送信後、「LINE連携が完了しました。」と返信が届けば完了です。</li>
          </ol>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-red-200 p-6 dark:border-red-900">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">退会</h2>
        <p className="text-sm text-zinc-500">
          退会すると、ログインできなくなり、所属しているチームからも自動的に抜けます。食事画像は退会から90日後に自動的に削除されます。この操作は取り消せません。
        </p>
        {withdrawError && <p className="text-sm text-red-600 dark:text-red-400">{withdrawError}</p>}
        <button
          onClick={withdrawAccount}
          disabled={withdrawing}
          className="self-start rounded-full border border-red-300 px-5 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
        >
          {withdrawing ? "処理中..." : "退会する"}
        </button>
      </section>
    </div>
  );
}
