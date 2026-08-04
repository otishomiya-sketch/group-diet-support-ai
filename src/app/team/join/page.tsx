import { redirect } from "next/navigation";
import Link from "next/link";

import { auth } from "@/auth";
import { joinTeamByCode } from "@/lib/group/join-team";
import { BackToDashboardLink } from "@/components/nav/BackToDashboardLink";

// 招待コードを含む共有URL(/team/join?code=XXXX)の着地ページ。
// 未ログインの場合は登録/ログインへ、ログイン済みの場合はその場で参加処理を行う。
export default async function TeamJoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  if (!code) {
    redirect("/team");
  }

  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">チームに招待されました</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          招待コード「{code}」でチームに参加するには、まずログインまたは新規登録してください。
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href={`/register?code=${encodeURIComponent(code)}`}
            className="rounded-full bg-zinc-900 px-6 py-3 text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-black"
          >
            新規登録して参加する
          </Link>
          <Link
            href={`/login?code=${encodeURIComponent(code)}`}
            className="rounded-full border border-zinc-300 px-6 py-3 text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            すでにアカウントがある(ログイン)
          </Link>
        </div>
      </div>
    );
  }

  const result = await joinTeamByCode(session.user.id, code);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">チーム参加</h1>
      {result.ok ? (
        <p className="text-green-600 dark:text-green-400">チームに参加しました。</p>
      ) : (
        <p className="text-red-600 dark:text-red-400">{result.error}</p>
      )}
      <Link
        href="/team"
        className="rounded-full bg-zinc-900 px-6 py-3 text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-black"
      >
        チームページへ
      </Link>
      <BackToDashboardLink />
    </div>
  );
}
