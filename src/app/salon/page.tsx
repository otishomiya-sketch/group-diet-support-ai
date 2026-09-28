"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
    return <div className="px-6 py-16 text-salon-muted">読み込み中...</div>;
  }

  if (salon === null) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-6 py-16">
        <BackLink />
        <h1 className="font-salon-display text-3xl font-semibold text-salon-heading">サロン管理</h1>
        <p className="text-salon-muted">このアカウントはサロンのスタッフとして登録されていません。</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-6 py-16">
      <BackLink />
      <div>
        <p className="mb-1 text-xs tracking-widest text-salon-gold uppercase">Salon Dashboard</p>
        <h1 className="font-salon-display text-3xl font-semibold text-salon-heading">{salon.name}</h1>
      </div>

      <section className="rounded-2xl border border-salon-border bg-salon-surface p-6 shadow-sm shadow-salon-accent/5">
        <h2 className="font-salon-display mb-2 text-xl font-semibold text-salon-heading">
          💌 顧客を招待する
        </h2>
        <p className="mb-4 text-sm text-salon-muted">
          このリンクから登録した方は、自動的にこのサロンの顧客として登録されます。
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={copyInviteLink}
            className="rounded-full bg-salon-accent-strong px-4 py-2 text-sm text-salon-on-strong hover:bg-salon-accent-hover"
          >
            {linkCopied ? "リンクをコピーしました" : "招待リンクをコピー"}
          </button>
          <code className="rounded-full bg-salon-accent-soft px-3 py-1.5 tracking-wider text-salon-heading">
            {salon.customerInviteCode}
          </code>
          <button
            onClick={copyInviteCode}
            className="rounded-full border border-salon-border px-4 py-1.5 text-sm text-salon-ink hover:bg-salon-accent-soft"
          >
            {copied ? "コピーしました" : "コードをコピー"}
          </button>
        </div>
      </section>

      <SalonBulkMessage customers={salon.customers} />

      <section>
        <h2 className="font-salon-display mb-1 text-xl font-semibold text-salon-heading">顧客一覧</h2>
        <p className="mb-3 text-xs text-salon-muted">
          「記録を見る」で体重推移・食事の記録(写真含む)を確認できます。
        </p>
        <ul className="flex flex-col gap-3">
          {salon.customers.map((c) => (
            <SalonCustomerRow key={c.userId} customer={c} />
          ))}
          {salon.customers.length === 0 && (
            <p className="text-sm text-salon-muted">まだ顧客が登録されていません。</p>
          )}
        </ul>
      </section>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard"
      className="inline-flex w-fit items-center gap-1 text-sm text-salon-muted hover:text-salon-heading"
    >
      ← マイページに戻る
    </Link>
  );
}
