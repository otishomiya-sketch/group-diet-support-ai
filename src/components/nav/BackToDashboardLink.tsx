import Link from "next/link";

export function BackToDashboardLink() {
  return (
    <Link
      href="/dashboard"
      className="inline-flex w-fit items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
    >
      ← マイページに戻る
    </Link>
  );
}
