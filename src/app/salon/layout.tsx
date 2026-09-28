import { Cormorant_Garamond } from "next/font/google";

const salonSerif = Cormorant_Garamond({
  variable: "--font-salon-serif",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

// スタッフ用サロン画面(/salon)専用の見た目:暖色系(salon-*トークン)+エレガントなセリフ見出し。
export default function SalonLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${salonSerif.variable} flex min-h-full flex-1 flex-col bg-salon-bg text-salon-ink`}>
      {children}
    </div>
  );
}
