"use client";

import { useEffect, useState } from "react";

// 体重・食事の報告は基本的にLINE経由で行うため、未連携のユーザーがマイページの奥深く
// (設定画面)に気づかず迷子にならないよう、ダッシュボードの先頭で連携を促す。
// 連携済みになったら何も表示しない(自己完結・自己非表示)。

export function LineLinkPrompt() {
  const [lineLinked, setLineLinked] = useState<boolean | null>(null);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [addFriendUrl, setAddFriendUrl] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    fetch("/api/mypage/settings")
      .then((res) => res.json())
      .then((data) => setLineLinked(Boolean(data.lineLinked)));
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

  if (lineLinked !== false) {
    return null;
  }

  return (
    <section className="rounded-lg border-2 border-[#06C755] bg-[#06C755]/5 p-6">
      <h2 className="mb-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">
        まずLINE連携をしてください
      </h2>
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-300">
        体重の報告・食事写真の送信はLINEで行います。以下の2ステップで連携できます(1分ほどで完了します)。
      </p>
      <ol className="flex list-decimal flex-col gap-4 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
        <li>
          <p className="mb-2">LINE公式アカウントを友だち追加してください。</p>
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
    </section>
  );
}
