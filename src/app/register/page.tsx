"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("code");
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
    height: "",
    currentWeight: "",
    targetWeight: "",
    targetDate: "",
    gender: "",
    birthDate: "",
    activityLevel: "medium",
    agencyReferralCode: "",
    agreedToTerms: false,
    agreedToWeightShareDisclosure: false,
  });
  const [warnings, setWarnings] = useState<{ code: string; message: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "登録に失敗しました。");
        return;
      }
      setWarnings(data.warnings ?? []);
      router.push(inviteCode ? `/login?code=${encodeURIComponent(inviteCode)}` : "/login");
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">目標設定・新規登録</h1>

      {inviteCode && (
        <p className="rounded-md bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          チーム招待コード「{inviteCode}」を検出しました。登録後、自動でこのチームに参加します。
        </p>
      )}

      {error && (
        <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      {warnings.map((w) => (
        <p
          key={w.code}
          className="rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200"
        >
          {w.message}
        </p>
      ))}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <input
          className={inputClass}
          placeholder="表示名"
          value={form.displayName}
          onChange={(e) => update("displayName", e.target.value)}
          required
        />
        <input
          className={inputClass}
          type="email"
          placeholder="メールアドレス"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          required
        />
        <input
          className={inputClass}
          type="password"
          placeholder="パスワード(8文字以上)"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            身長(cm)
            <input
              className={inputClass}
              type="number"
              step="0.1"
              value={form.height}
              onChange={(e) => update("height", e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            現在体重(kg)
            <input
              className={inputClass}
              type="number"
              step="0.1"
              value={form.currentWeight}
              onChange={(e) => update("currentWeight", e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            目標体重(kg)
            <input
              className={inputClass}
              type="number"
              step="0.1"
              value={form.targetWeight}
              onChange={(e) => update("targetWeight", e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            目標期限
            <input
              className={inputClass}
              type="date"
              value={form.targetDate}
              onChange={(e) => update("targetDate", e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            性別
            <input
              className={inputClass}
              value={form.gender}
              onChange={(e) => update("gender", e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            生年月日
            <input
              className={inputClass}
              type="date"
              value={form.birthDate}
              onChange={(e) => update("birthDate", e.target.value)}
              required
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
          活動量レベル
          <select
            className={inputClass}
            value={form.activityLevel}
            onChange={(e) => update("activityLevel", e.target.value)}
          >
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </label>

        <input
          className={inputClass}
          placeholder="代理店紹介コード(任意)"
          value={form.agencyReferralCode}
          onChange={(e) => update("agencyReferralCode", e.target.value)}
        />

        <label className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            className="mt-1"
            checked={form.agreedToTerms}
            onChange={(e) => update("agreedToTerms", e.target.checked)}
          />
          利用規約(自己責任同意)に同意します。
        </label>
        <label className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            className="mt-1"
            checked={form.agreedToWeightShareDisclosure}
            onChange={(e) => update("agreedToWeightShareDisclosure", e.target.checked)}
          />
          チーム内であなたの体重減少が共有されることに同意します。
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-full bg-zinc-900 px-6 py-3 text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-black"
        >
          {submitting ? "登録中..." : "登録する"}
        </button>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
