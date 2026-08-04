import { redirect } from "next/navigation";
import Link from "next/link";

import { auth } from "@/auth";
import { getUserProfile } from "@/lib/sensitive/user-profile";
import { calculateBmr, calculateDailyCalorieTarget } from "@/lib/health/bmr";
import { getCalorieTrend, getWeightTrend } from "@/lib/checkin/trends";
import { TrendCharts } from "@/components/dashboard/TrendCharts";

const TREND_WINDOW_DAYS = 90;

function ageFromBirthDate(birthDate: Date): number {
  const diff = Date.now() - birthDate.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const profile = await getUserProfile(session.user.id);
  if (!profile) {
    redirect("/login");
  }

  const bmr = calculateBmr({
    weightKg: profile.currentWeight,
    heightCm: profile.height,
    ageYears: ageFromBirthDate(profile.birthDate),
    gender: profile.gender,
  });
  const calorieTarget = calculateDailyCalorieTarget(bmr, profile.activityLevel);
  const remainingKg = profile.currentWeight - profile.targetWeight;

  const [weightSeries, calorieSeries] = await Promise.all([
    getWeightTrend(session.user.id, TREND_WINDOW_DAYS),
    getCalorieTrend(session.user.id, TREND_WINDOW_DAYS),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        {profile.displayName} さんのマイページ
      </h1>

      <section className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          目標達成までの逆算(②逆算エンジン)
        </h2>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-zinc-500">現在体重</dt>
          <dd>{profile.currentWeight} kg</dd>
          <dt className="text-zinc-500">目標体重</dt>
          <dd>{profile.targetWeight} kg</dd>
          <dt className="text-zinc-500">目標までの残量</dt>
          <dd>{remainingKg > 0 ? remainingKg.toFixed(1) : 0} kg</dd>
          <dt className="text-zinc-500">目標期限</dt>
          <dd>{profile.targetDate.toISOString().slice(0, 10)}</dd>
          <dt className="text-zinc-500">推定基礎代謝(暫定式・要専門家確認)</dt>
          <dd>{Math.round(bmr)} kcal/日</dd>
          <dt className="text-zinc-500">活動量を踏まえた消費目安</dt>
          <dd>{Math.round(calorieTarget)} kcal/日</dd>
          {profile.bmiDisplayOptIn && profile.bmi && (
            <>
              <dt className="text-zinc-500">BMI</dt>
              <dd>{profile.bmi.toFixed(1)}</dd>
            </>
          )}
        </dl>
      </section>

      <TrendCharts
        weightSeries={weightSeries}
        calorieSeries={calorieSeries}
        calorieTargetPerDay={calorieTarget}
      />

      <nav className="flex flex-wrap gap-3">
        <Link
          href="/checkin"
          className="rounded-full bg-zinc-900 px-5 py-2 text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-black"
        >
          日次チェックイン
        </Link>
        <Link
          href="/team"
          className="rounded-full border border-zinc-300 px-5 py-2 text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
        >
          チーム
        </Link>
        <Link
          href="/mypage/settings"
          className="rounded-full border border-zinc-300 px-5 py-2 text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
        >
          設定
        </Link>
      </nav>
    </div>
  );
}
