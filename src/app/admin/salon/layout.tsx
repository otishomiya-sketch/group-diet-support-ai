import { Cormorant_Garamond } from "next/font/google";

const salonSerif = Cormorant_Garamond({
  variable: "--font-salon-serif",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

// 運営用サロン画面(/admin/salon以下)も、スタッフ画面と統一した暖色系デザインにする。
export default function AdminSalonLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${salonSerif.variable} flex min-h-full flex-1 flex-col bg-salon-bg text-salon-ink`}>
      {children}
    </div>
  );
}
