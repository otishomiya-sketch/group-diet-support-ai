import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 py-24 text-center dark:bg-black">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        グループダイエット支援AI
      </h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        日次逆算・チーム制の相互鼓舞・LINE連携で、目標達成を後押しします。
      </p>
      <div className="flex gap-4">
        <Link
          href="/register"
          className="rounded-full bg-zinc-900 px-6 py-3 text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-black"
        >
          新規登録
        </Link>
        <Link
          href="/login"
          className="rounded-full border border-zinc-300 px-6 py-3 text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
        >
          ログイン
        </Link>
      </div>
    </div>
  );
}
