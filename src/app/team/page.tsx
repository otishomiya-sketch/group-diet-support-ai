"use client";

import { useEffect, useState } from "react";

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

export default function TeamPage() {
  const [team, setTeam] = useState<{ members: TeamMember[]; messages: TeamMessage[] } | null | undefined>(
    undefined,
  );

  useEffect(() => {
    fetch("/api/team")
      .then((res) => res.json())
      .then((data) => setTeam(data.team));
  }, []);

  if (team === undefined) {
    return <div className="px-6 py-16 text-zinc-500">読み込み中...</div>;
  }

  if (team === null) {
    return (
      <div className="px-6 py-16 text-zinc-500">
        まだチームに所属していません。マッチングバッチの実行をお待ちください。
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-6 py-16">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">チーム</h1>

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
