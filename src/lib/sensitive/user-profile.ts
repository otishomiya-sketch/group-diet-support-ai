import type { User } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  decryptDate,
  decryptField,
  decryptNumber,
  encryptDate,
  encryptField,
  encryptNumber,
  hashForLookup,
} from "@/lib/crypto/field-encryption";
import { calculateBmi } from "@/lib/health/bmi";

// User.height/gender/birthDate/currentWeight/targetWeight/lineUserIdは暗号化文字列としてのみ
// DBに保存される(7.3節)。このモジュールが唯一の復号・暗号化の窓口であり、他のコードは
// prisma.user を直接読み書きせず、必ずこの層を経由すること。

export interface UserProfileDto {
  id: string;
  email: string;
  displayName: string;
  height: number;
  gender: string;
  birthDate: Date;
  currentWeight: number;
  targetWeight: number;
  targetDate: Date;
  activityLevel: string;
  bmi: number | null;
  bmiDisplayOptIn: boolean;
  weightShareOptOut: boolean;
  weightReportFrequency: string;
  agreedToTerms: boolean;
  agreedToWeightShareDisclosure: boolean;
  agencyReferralCode: string | null;
  role: string;
  createdAt: Date;
  withdrawnAt: Date | null;
}

export function decryptUserProfile(user: User): UserProfileDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    height: decryptNumber(user.heightEncrypted),
    gender: decryptField(user.genderEncrypted),
    birthDate: decryptDate(user.birthDateEncrypted),
    currentWeight: decryptNumber(user.currentWeightEncrypted),
    targetWeight: decryptNumber(user.targetWeightEncrypted),
    targetDate: user.targetDate,
    activityLevel: user.activityLevel,
    bmi: user.bmi,
    bmiDisplayOptIn: user.bmiDisplayOptIn,
    weightShareOptOut: user.weightShareOptOut,
    weightReportFrequency: user.weightReportFrequency,
    agreedToTerms: user.agreedToTerms,
    agreedToWeightShareDisclosure: user.agreedToWeightShareDisclosure,
    agencyReferralCode: user.agencyReferralCode,
    role: user.role,
    createdAt: user.createdAt,
    withdrawnAt: user.withdrawnAt,
  };
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  displayName: string;
  height: number;
  gender: string;
  birthDate: Date;
  currentWeight: number;
  targetWeight: number;
  targetDate: Date;
  activityLevel: string;
  agencyReferralCode?: string | null;
  agreedToTerms: boolean;
  agreedToWeightShareDisclosure: boolean;
}

export async function createUserProfile(input: CreateUserInput): Promise<UserProfileDto> {
  const bmi = calculateBmi(input.height, input.currentWeight);
  const now = new Date();

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash: input.passwordHash,
      displayName: input.displayName,
      heightEncrypted: encryptNumber(input.height),
      genderEncrypted: encryptField(input.gender),
      birthDateEncrypted: encryptDate(input.birthDate),
      currentWeightEncrypted: encryptNumber(input.currentWeight),
      targetWeightEncrypted: encryptNumber(input.targetWeight),
      targetDate: input.targetDate,
      activityLevel: input.activityLevel,
      bmi,
      agencyReferralCode: input.agencyReferralCode ?? null,
      agreedToTerms: input.agreedToTerms,
      agreedToTermsAt: input.agreedToTerms ? now : null,
      agreedToWeightShareDisclosure: input.agreedToWeightShareDisclosure,
      agreedToWeightShareDisclosureAt: input.agreedToWeightShareDisclosure ? now : null,
    },
  });

  return decryptUserProfile(user);
}

export async function getUserProfile(userId: string): Promise<UserProfileDto | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user ? decryptUserProfile(user) : null;
}

export async function getUserProfileByEmail(email: string): Promise<UserProfileDto | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  return user ? decryptUserProfile(user) : null;
}

/** 3.4節:体重報告時にサーバー側でweightDeltaを算出するための直近体重値。 */
export async function getCurrentWeightKg(userId: string): Promise<number> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { currentWeightEncrypted: true },
  });
  return decryptNumber(user.currentWeightEncrypted);
}

export async function updateCurrentWeight(userId: string, newWeightKg: number): Promise<number> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { heightEncrypted: true },
  });
  const heightCm = decryptNumber(user.heightEncrypted);
  const bmi = calculateBmi(heightCm, newWeightKg);

  await prisma.user.update({
    where: { id: userId },
    data: { currentWeightEncrypted: encryptNumber(newWeightKg), bmi },
  });

  return bmi;
}

export interface UpdateGoalInput {
  targetWeight: number;
  targetDate: Date;
}

/**
 * 目標体重・期限の更新。3.8節 low_bmi_target_retry の検知対象になるため、
 * 現在のBMIが閾値未満の場合は再設定回数をインクリメントして返す(検知バッチはこのカウントを参照する)。
 */
export async function updateGoal(
  userId: string,
  input: UpdateGoalInput,
  isLowBmiAtTimeOfChange: boolean,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      targetWeightEncrypted: encryptNumber(input.targetWeight),
      targetDate: input.targetDate,
      ...(isLowBmiAtTimeOfChange
        ? { targetWeightRevisionCount: { increment: 1 } }
        : {}),
    },
  });
}

export async function setLineUserId(userId: string, rawLineUserId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      lineUserIdHash: hashForLookup(rawLineUserId),
      lineUserIdEncrypted: encryptField(rawLineUserId),
    },
  });
}

export async function findUserIdByLineUserId(rawLineUserId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { lineUserIdHash: hashForLookup(rawLineUserId) },
    select: { id: true },
  });
  return user?.id ?? null;
}

/** LINE Push APIの呼び出し時のみ使用。ログ出力やUI表示に生のLINEユーザーIDを出さないこと。 */
export async function getLineUserIdForPush(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lineUserIdEncrypted: true },
  });
  if (!user?.lineUserIdEncrypted) {
    return null;
  }
  return decryptField(user.lineUserIdEncrypted);
}
