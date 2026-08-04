"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("code");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setSubmitting(false);
      setError("メールアドレスまたはパスワードが正しくありません。");
      return;
    }

    if (inviteCode) {
      const joinRes = await fetch("/api/team/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode }),
      });
      setSubmitting(false);
      if (!joinRes.ok) {
        const data = await joinRes.json().catch(() => ({}));
        router.push(`/team?joinError=${encodeURIComponent(data.error ?? "参加に失敗しました。")}`);
        return;
      }
      router.push("/team");
      return;
    }

    setSubmitting(false);
    router.push("/dashboard");
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">ログイン</h1>
      {inviteCode && (
        <p className="rounded-md bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          ログイン後、チーム招待コード「{inviteCode}」で自動的に参加します。
        </p>
      )}
      {error && (
        <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <input
          className={inputClass}
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className={inputClass}
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-zinc-900 px-6 py-3 text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-black"
        >
          {submitting ? "処理中..." : "ログイン"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
