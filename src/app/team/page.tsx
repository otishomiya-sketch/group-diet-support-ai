"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { BackToDashboardLink } from "@/components/nav/BackToDashboardLink";

interface TeamMember {
  userId: string;
  displayName: string;
  achievedToday: boolean;
}

interface TeamMessage {
  messageType: string;
  filteredOutput: string;
  sentAt: string;
}

interface TeamData {
  formationType: string;
  inviteCode: string | null;
  capacity: number;
  members: TeamMember[];
  messages: TeamMessage[];
}

const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

function TeamPageInner() {
  const searchParams = useSearchParams();
  const [team, setTeam] = useState<TeamData | null | undefined>(undefined);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(() => searchParams.get("joinError"));
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    fetch("/api/team")
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) setTeam(data.team);
      });
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  async function createFriendTeam() {
    setError(null);
    const res = await fetch("/api/team/create-friend", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "作成に失敗しました。");
      return;
    }
    setRefreshKey((k) => k + 1);
  }

  async function joinTeam(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/team/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: joinCode }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "参加に失敗しました。");
      return;
    }
    setRefreshKey((k) => k + 1);
  }

  function copyInviteCode() {
    if (!team?.inviteCode) return;
    navigator.clipboard.writeText(team.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyInviteLink() {
    if (!team?.inviteCode) return;
    navigator.clipboard.writeText(`${window.location.origin}/team/join?code=${team.inviteCode}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  if (team === undefined) {
    return <div className="px-6 py-16 text-zinc-500">読み込み中...</div>;
  }

  if (team === null) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-6 py-16">
        <BackToDashboardLink />
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">チーム</h1>
        <p className="text-zinc-500">
          まだチームに所属していません。友達を誘って自分のチームを作るか、もらった招待コードで参加してください。
        </p>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <section className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            友達を誘ってチームを作る
          </h2>
          <p className="mb-3 text-sm text-zinc-500">
            あなたを含む最大8名までの「チーム」を新しく作ります。作成後、専用の招待リンク・招待コードが発行されるので、それを友達に送って参加してもらいます。
          </p>
          <button
            onClick={createFriendTeam}
            className="rounded-full bg-zinc-900 px-5 py-2 text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-black"
          >
            チームを作成する
          </button>
        </section>

        <section className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            招待コードで参加する
          </h2>
          <p className="mb-3 text-sm text-zinc-500">
            友達からチームへの招待リンクを開けなかった場合は、友達から直接教えてもらった招待コードをここに入力すると、そのチームに参加できます。
          </p>
          <form onSubmit={joinTeam} className="flex gap-3">
            <input
              className={inputClass}
              placeholder="招待コード(例:AB23CD45)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              required
            />
            <button
              type="submit"
              className="rounded-full border border-zinc-300 px-5 py-2 text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              参加
            </button>
          </form>
        </section>

        <p className="text-sm text-zinc-500">
          自分でチームを作らない場合は、BMIマッチングバッチによって自動的にソロ参加者同士のチームに割り当てられます。
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-6 py-16">
      <BackToDashboardLink />
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">チーム</h1>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {team.formationType === "friend" && team.inviteCode && (
        <section className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            友達を招待する
          </h2>
          <p className="mb-3 text-sm text-zinc-500">
            これは、あなたの今のチーム(現在{team.members.length}/{team.capacity}名)へ友達を招待するためのものです。招待された友達がこのアプリに登録(またはログイン)すると、自動的にあなたと同じチームのメンバーになり、お互いの日々の達成状況やAIコーチからの応援メッセージを共有できるようになります。
          </p>
          <p className="mb-1 text-xs font-medium text-zinc-500">① まずはこのリンクを送るのがおすすめです:</p>
          <div className="mb-3 flex items-center gap-3">
            <button
              onClick={copyInviteLink}
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-black"
            >
              {linkCopied ? "リンクをコピーしました" : "招待リンクをコピー"}
            </button>
          </div>
          <p className="mb-1 text-xs font-medium text-zinc-500">
            ② リンクが開けない場合は、代わりにこの招待コードを伝え、友達に「チーム」画面の「招待コードで参加する」に入力してもらってください:
          </p>
          <div className="flex items-center gap-3">
            <code className="rounded bg-zinc-100 px-4 py-2 text-lg tracking-wider dark:bg-zinc-900">
              {team.inviteCode}
            </code>
            <button
              onClick={copyInviteCode}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              {copied ? "コピーしました" : "コピー"}
            </button>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">メンバー</h2>
        <ul className="flex flex-col gap-2">
          {team.members.map((m) => (
            <li
              key={m.userId}
              className="flex items-center justify-between rounded-md border border-zinc-200 px-4 py-2 dark:border-zinc-800"
            >
              <span>{m.displayName}</span>
              <span
                className={
                  m.achievedToday
                    ? "text-sm text-green-600 dark:text-green-400"
                    : "text-sm text-zinc-400"
                }
              >
                {m.achievedToday ? "本日達成" : "未達成"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">コーチからのメッセージ</h2>
        {team.messages.length === 0 && (
          <p className="text-sm text-zinc-500">まだメッセージはありません。</p>
        )}
        <ul className="flex flex-col gap-3">
          {team.messages.map((m, i) => (
            <li key={i} className="rounded-md bg-zinc-100 px-4 py-3 text-sm dark:bg-zinc-900">
              <p className="whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">{m.filteredOutput}</p>
              <p className="mt-1 text-xs text-zinc-400">{new Date(m.sentAt).toLocaleString("ja-JP")}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function TeamPage() {
  return (
    <Suspense fallback={null}>
      <TeamPageInner />
    </Suspense>
  );
}
