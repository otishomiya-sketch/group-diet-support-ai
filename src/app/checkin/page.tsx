"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

export default function CheckInPage() {
  const [weight, setWeight] = useState("");
  const [weightMessage, setWeightMessage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [mealMessage, setMealMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewUrl = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : null),
    [imageFile],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function submitWeight(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setWeightMessage(null);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "weight", weightValueKg: Number(weight) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setWeightMessage(data.error ?? "エラーが発生しました。");
        return;
      }
      setWeightMessage("体重を記録しました。");
      setWeight("");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitMeal(e: React.FormEvent) {
    e.preventDefault();
    if (!imageFile) return;
    setSubmitting(true);
    setMealMessage(null);
    try {
      const base64 = await fileToBase64(imageFile);
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "meal",
          imageBase64: base64,
          contentType: imageFile.type,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMealMessage(data.error ?? "エラーが発生しました。");
        return;
      }
      setMealMessage("食事画像を送信しました。");
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-6 py-16">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">日次チェックイン</h1>

      <section className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">体重報告</h2>
        {weightMessage && <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">{weightMessage}</p>}
        <form onSubmit={submitWeight} className="flex gap-3">
          <input
            className={inputClass}
            type="number"
            step="0.1"
            placeholder="体重(kg)"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-zinc-900 px-5 py-2 text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-black"
          >
            記録
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">食事画像</h2>
        <p className="mb-3 text-sm text-zinc-500">
          食事の写真を撮って送信してください。回数の制限はありません。
        </p>
        {mealMessage && <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">{mealMessage}</p>}
        <form onSubmit={submitMeal} className="flex flex-col gap-4">
          <input
            ref={fileInputRef}
            id="meal-image-input"
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          />

          {previewUrl ? (
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="選択した食事画像のプレビュー"
                className="h-24 w-24 rounded-md object-cover"
              />
              <label
                htmlFor="meal-image-input"
                className="cursor-pointer rounded-full border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                写真を選び直す
              </label>
            </div>
          ) : (
            <label
              htmlFor="meal-image-input"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 px-6 py-10 text-center text-sm text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              <span className="text-2xl">📷</span>
              タップして写真を撮る、または画像を選ぶ
            </label>
          )}

          <button
            type="submit"
            disabled={submitting || !imageFile}
            className="self-start rounded-full bg-zinc-900 px-5 py-2 text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-black"
          >
            {submitting ? "送信中..." : "この写真を送信"}
          </button>
        </form>
      </section>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
