"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

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

export default function AdminSalonCustomersPage() {
  const { id } = useParams<{ id: string }>();
  const [salon, setSalon] = useState<SalonData | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const apiBasePath = `/api/admin/salon/${id}`;

  useEffect(() => {
    let ignore = false;
    fetch(apiBasePath)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (ignore) return;
        if (!res.ok) {
          setError(data.error ?? "取得に失敗しました。");
          setSalon(null);
          return;
        }
        setSalon(data.salon);
      })
      .catch(() => {
        if (!ignore) {
          setError("通信エラーが発生しました。");
          setSalon(null);
        }
      });
    return () => {
      ignore = true;
    };
  }, [apiBasePath]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-6 py-16">
      <Link
        href="/admin/salon"
        className="inline-flex w-fit items-center gap-1 text-sm text-salon-muted hover:text-salon-heading"
      >
        ← サロン管理に戻る
      </Link>

      {salon === undefined && !error && <p className="text-salon-muted">読み込み中...</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {salon && (
        <>
          <div>
            <p className="mb-1 text-xs tracking-widest text-salon-gold uppercase">Customer Management</p>
            <h1 className="font-salon-display text-3xl font-semibold text-salon-heading">{salon.name}</h1>
          </div>

          <SalonBulkMessage customers={salon.customers} apiBasePath={apiBasePath} />

          <section>
            <h2 className="font-salon-display mb-1 text-xl font-semibold text-salon-heading">
              顧客一覧
            </h2>
            <p className="mb-3 text-xs text-salon-muted">
              「記録を見る」で体重推移・食事の記録(写真含む)を確認できます。
            </p>
            <ul className="flex flex-col gap-3">
              {salon.customers.map((c) => (
                <SalonCustomerRow key={c.userId} customer={c} apiBasePath={apiBasePath} />
              ))}
              {salon.customers.length === 0 && (
                <p className="text-sm text-salon-muted">まだ顧客が登録されていません。</p>
              )}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
