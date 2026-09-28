"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await signOut({ redirect: false });
    router.push("/login");
  }

  return (
    <button onClick={logout} disabled={loading} className={className}>
      {loading ? "ログアウト中..." : "ログアウト"}
    </button>
  );
}
