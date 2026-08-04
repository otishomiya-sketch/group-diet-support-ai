import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { createUserProfile } from "@/lib/sensitive/user-profile";
import { validateGoalSetting } from "@/lib/health/bmi";

// 3.1節:①目標設定オンボーディング。
// 入力フォーム項目:現在体重、目標体重、目標期限、身長、性別、生年月日、活動量レベル
// 同意取得フロー(必須):自己責任同意 + 体重共有に関する事前告知への同意。
// どちらか欠けている場合は登録を完了させない。

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const ACTIVITY_LEVELS = new Set(["low", "medium", "high"]);

function parseNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const agencyReferralCode =
    typeof body?.agencyReferralCode === "string" ? body.agencyReferralCode.trim() : "";

  const height = parseNumber(body?.height);
  const currentWeight = parseNumber(body?.currentWeight);
  const targetWeight = parseNumber(body?.targetWeight);
  const targetDateRaw = typeof body?.targetDate === "string" ? new Date(body.targetDate) : null;
  const gender = typeof body?.gender === "string" ? body.gender.trim() : "";
  const birthDateRaw = typeof body?.birthDate === "string" ? new Date(body.birthDate) : null;
  const activityLevel = typeof body?.activityLevel === "string" ? body.activityLevel : "";

  const agreedToTerms = body?.agreedToTerms === true;
  const agreedToWeightShareDisclosure = body?.agreedToWeightShareDisclosure === true;

  if (!displayName) {
    return NextResponse.json({ error: "表示名を入力してください。" }, { status: 400 });
  }
  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "有効なメールアドレスを入力してください。" }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `パスワードは${MIN_PASSWORD_LENGTH}文字以上で入力してください。` },
      { status: 400 },
    );
  }
  if (!height || height <= 0 || !currentWeight || currentWeight <= 0 || !targetWeight || targetWeight <= 0) {
    return NextResponse.json({ error: "身長・体重は正の数値で入力してください。" }, { status: 400 });
  }
  if (!targetDateRaw || Number.isNaN(targetDateRaw.getTime()) || targetDateRaw.getTime() <= Date.now()) {
    return NextResponse.json({ error: "目標期限は未来の日付で入力してください。" }, { status: 400 });
  }
  if (!gender) {
    return NextResponse.json({ error: "性別を入力してください。" }, { status: 400 });
  }
  if (!birthDateRaw || Number.isNaN(birthDateRaw.getTime())) {
    return NextResponse.json({ error: "生年月日を入力してください。" }, { status: 400 });
  }
  if (!ACTIVITY_LEVELS.has(activityLevel)) {
    return NextResponse.json({ error: "活動量レベルを選択してください。" }, { status: 400 });
  }

  // 3.1節:同意取得フロー。どちらかが欠けている場合は登録を完了させない。
  if (!agreedToTerms) {
    return NextResponse.json({ error: "利用規約(自己責任同意)への同意が必要です。" }, { status: 400 });
  }
  if (!agreedToWeightShareDisclosure) {
    return NextResponse.json(
      { error: "「チーム内であなたの体重減少が共有されます」という事前告知への同意が必要です。" },
      { status: 400 },
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ error: "このメールアドレスは既に登録されています。" }, { status: 409 });
  }

  // ソフト警告(3.1節)。目標体重の入力自体はブロックしない。
  const warnings = await validateGoalSetting({
    heightCm: height,
    currentWeightKg: currentWeight,
    targetWeightKg: targetWeight,
    targetDate: targetDateRaw,
  });

  const passwordHash = await bcrypt.hash(password, 12);
  const profile = await createUserProfile({
    email,
    passwordHash,
    displayName,
    height,
    gender,
    birthDate: birthDateRaw,
    currentWeight,
    targetWeight,
    targetDate: targetDateRaw,
    activityLevel,
    agencyReferralCode: agencyReferralCode || null,
    agreedToTerms,
    agreedToWeightShareDisclosure,
  });

  return NextResponse.json(
    {
      user: { id: profile.id, email: profile.email, displayName: profile.displayName },
      warnings,
    },
    { status: 201 },
  );
}
