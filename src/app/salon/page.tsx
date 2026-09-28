"use client";

import { useEffect, useState } from "react";

import { BackToDashboardLink } from "@/components/nav/BackToDashboardLink";
import { SalonCustomerRow } from "@/components/salon/SalonCustomerRow";
import { SalonBulkMessage } from "@/components/salon/SalonBulkMessage";

interface SalonCustomer {
  userId: string;
  displayName: string;
  achievementRate: number;
}

interface SalonData {
  id: string;
  name: string;
  customerInviteCode: string;
  customers: SalonCustomer[];
}

export default function SalonPage() {
  const [salon, setSalon] = useState<SalonData | null | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    let ignore = false;
    fetch("/api/salon")
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) setSalon(data.salon);
      });
    return () => {
      ignore = true;
    };
  }, []);

  function copyInviteCode() {
    if (!salon) return;
    navigator.clipboard.writeText(salon.customerInviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyInviteLink() {
    if (!salon) return;
    navigator.clipboard.writeText(
      `${window.location.origin}/register?salonCode=${salon.customerInviteCode}`,
    );
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  if (salon === undefined) {
    return <div className="px-6 py-16 text-zinc-500">読み込み中...</div>;
  }

  if (salon === null) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-6 py-16">
        <BackToDashboardLink />
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">サロン管理</h1>
        <p className="text-zinc-500">このアカウントはサロンのスタッフとして登録されていません。</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-6 py-16">
      <BackToDashboardLink />
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{salon.name}</h1>

      <section className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">顧客を招待する</h2>
        <p className="mb-3 text-sm text-zinc-500">
          このリンクから登録した方は、自動的にこのサロンの顧客として登録されます。
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={copyInviteLink}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-black"
          >
            {linkCopied ? "リンクをコピーしました" : "招待リンクをコピー"}
          </button>
          <code className="rounded bg-zinc-100 px-3 py-1.5 tracking-wider dark:bg-zinc-900">
            {salon.customerInviteCode}
          </code>
          <button
            onClick={copyInviteCode}
            className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            {copied ? "コピーしました" : "コードをコピー"}
          </button>
        </div>
      </section>

      <SalonBulkMessage customers={salon.customers} />

      <section>
        <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">顧客一覧</h2>
        <p className="mb-3 text-xs text-zinc-500">
          「記録を見る」で体重推移・食事の記録(写真含む)を確認できます。
        </p>
        <ul className="flex flex-col gap-2">
          {salon.customers.map((c) => (
            <SalonCustomerRow key={c.userId} customer={c} />
          ))}
          {salon.customers.length === 0 && (
            <p className="text-sm text-zinc-500">まだ顧客が登録されていません。</p>
          )}
        </ul>
      </section>
    </div>
  );
}
