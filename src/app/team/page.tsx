"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

import { BackToDashboardLink } from "@/components/nav/BackToDashboardLink";
import { MemberActivityRow } from "@/components/team/MemberActivityRow";
import { DuelSection } from "@/components/team/DuelSection";

interface TeamMember {
  userId: string;
  displayName: string;
  achievedToday: boolean;
  achievementRate: number;
}

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

interface TeamData {
  formationType: string;
  inviteCode: string | null;
  capacity: number;
  members: TeamMember[];
}

const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

function buildInviteMessage(inviteCode: string, inviteUrl: string): string {
  return (
    "【グループダイエット支援AI】チームに招待します!\n" +
    "一緒に体重や食事を報告し合いながら、AIコーチと目標達成を目指しませんか?\n\n" +
    `▼参加はこちらから\n${inviteUrl}\n\n` +
    "▼リンクが開けない場合は、アプリの「招待コードで参加する」から下記コードを入力してください\n" +
    `招待コード: ${inviteCode}`
  );
}

function TeamPageInner() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [team, setTeam] = useState<TeamData | null | undefined>(undefined);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(() => searchParams.get("joinError"));
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [messageCopied, setMessageCopied] = useState(false);
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

  async function leaveTeam() {
    if (!window.confirm("本当にこのチームを抜けますか?再度参加するには招待コードが必要になります。")) {
      return;
    }
    setError(null);
    const res = await fetch("/api/team/leave", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "脱退に失敗しました。");
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

  function shareInviteToLine() {
    if (!team?.inviteCode) return;
    const inviteUrl = `${window.location.origin}/team/join?code=${team.inviteCode}`;
    const text = buildInviteMessage(team.inviteCode, inviteUrl);
    // line.me/R/msg/text はモバイルのLINEアプリ直接起動専用で、PCブラウザではurlパラメータの
    // ないシェアページにフォールバックし送信できないことがあるため、url/textを明示的に渡す
    // 「LINEでシェア」ウィジェット(social-plugins.line.me)をPC/モバイル問わず使用する。
    const shareUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(text)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  }

  async function shareInviteGeneric() {
    if (!team?.inviteCode) return;
    const inviteUrl = `${window.location.origin}/team/join?code=${team.inviteCode}`;
    const text = buildInviteMessage(team.inviteCode, inviteUrl);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text });
      } catch {
        // ユーザーが共有をキャンセルした場合は何もしない
      }
      return;
    }
    await navigator.clipboard.writeText(text);
    setMessageCopied(true);
    setTimeout(() => setMessageCopied(false), 2000);
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
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-6 py-16">
      <BackToDashboardLink />
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">チーム</h1>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <section className="rounded-lg border border-amber-300 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-950/30">
        <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          🏆 達成率ランキング
        </h2>
        <p className="mb-4 text-xs text-zinc-500">
          目標体重に対する減少の進み具合をチームで競います。開始時の体重と目標体重から算出した達成率です。
        </p>
        <ol className="flex flex-col gap-2">
          {team.members.map((m, i) => (
            <li
              key={m.userId}
              className={
                m.userId === session?.user?.id
                  ? "flex items-center gap-3 rounded-md border-2 border-amber-400 bg-white px-3 py-2 dark:bg-zinc-900"
                  : "flex items-center gap-3 rounded-md border border-transparent px-3 py-2"
              }
            >
              <span className="w-7 flex-shrink-0 text-center text-lg">
                {RANK_MEDALS[i] ?? `${i + 1}位`}
              </span>
              <span className="w-20 flex-shrink-0 truncate text-sm text-zinc-800 dark:text-zinc-200">
                {m.displayName}
              </span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <span
                  className="block h-full rounded-full bg-amber-500"
                  style={{ width: `${m.achievementRate}%` }}
                />
              </span>
              <span className="w-12 flex-shrink-0 text-right text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                {m.achievementRate}%
              </span>
            </li>
          ))}
        </ol>
      </section>

      <DuelSection />

      {team.formationType === "friend" && team.inviteCode && (
        <section className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            友達を招待する
          </h2>
          <p className="mb-3 text-sm text-zinc-500">
            これは、あなたの今のチーム(現在{team.members.length}/{team.capacity}名)へ友達を招待するためのものです。招待された友達がこのアプリに登録(またはログイン)すると、自動的にあなたと同じチームのメンバーになり、お互いの日々の達成状況や体重・食事の記録を共有し、達成率ランキングや対戦で競い合えるようになります。
          </p>
          <p className="mb-1 text-xs font-medium text-zinc-500">
            ① 何に招待しているか・招待リンク・招待コードをまとめたメッセージを、そのままLINEや他のアプリで送れます:
          </p>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button
              onClick={shareInviteToLine}
              className="inline-flex items-center gap-2 rounded-full bg-[#06C755] px-4 py-2 text-sm text-white hover:opacity-90"
            >
              LINEで送る
            </button>
            <button
              onClick={shareInviteGeneric}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              {messageCopied ? "メッセージをコピーしました" : "他のアプリで共有 / コピー"}
            </button>
          </div>
          <details className="text-xs text-zinc-500">
            <summary className="cursor-pointer select-none font-medium">
              リンクやコードだけを手動でコピーしたい場合
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={copyInviteLink}
                  className="rounded-full border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  {linkCopied ? "リンクをコピーしました" : "招待リンクをコピー"}
                </button>
              </div>
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
            </div>
          </details>
        </section>
      )}

      <section>
        <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">メンバー</h2>
        <p className="mb-3 text-xs text-zinc-500">
          「詳細を見る」でメンバーの体重推移・食事の記録(写真含む)を確認できます。
        </p>
        <ul className="flex flex-col gap-2">
          {team.members.map((m) => (
            <MemberActivityRow key={m.userId} member={m} />
          ))}
        </ul>
      </section>

      <section>
        <button
          onClick={leaveTeam}
          className="text-sm text-red-600 underline hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
        >
          このチームを抜ける
        </button>
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
