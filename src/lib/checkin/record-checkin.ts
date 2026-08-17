import { prisma } from "@/lib/prisma";
import { decryptNumber, encryptNumber } from "@/lib/crypto/field-encryption";
import { updateCurrentWeight } from "@/lib/sensitive/user-profile";
import { estimateMealCalories } from "@/lib/nutrition/estimate-calories";

export type CheckInSource = "line" | "app";

export interface RecordMealCheckInInput {
  userId: string;
  imageUrl: string;
  imageBuffer: Buffer;
  contentType: string;
  source: CheckInSource;
}

/**
 * 3.3節:食事画像チェックイン。送信回数の制限は設けない。
 * 画像からのカロリー概算(運営判断によりAI画像解析を採用)。推定に失敗しても
 * チェックイン自体は記録し、estimatedCalories/foodDescriptionはnullのままとする。
 */
export async function recordMealCheckIn(input: RecordMealCheckInInput) {
  const estimate = await estimateMealCalories(input.imageBuffer, input.contentType);

  return prisma.checkIn.create({
    data: {
      userId: input.userId,
      type: "meal",
      imageUrl: input.imageUrl,
      estimatedCalories: estimate?.estimatedCalories ?? null,
      foodDescription: estimate?.foodDescription ?? null,
      source: input.source,
    },
  });
}

export interface CreateMealCheckInInput {
  userId: string;
  imageUrl: string;
  source: CheckInSource;
}

/**
 * AI画像解析(数秒〜十数秒かかる)を待たずに、まずチェックイン自体を即座に記録する。
 * LINE Webhookのように応答速度が重要な呼び出し元向け(estimateAndUpdateMealCheckInと
 * 組み合わせ、解析完了後に別途更新する)。
 */
export async function createMealCheckIn(input: CreateMealCheckInInput) {
  return prisma.checkIn.create({
    data: {
      userId: input.userId,
      type: "meal",
      imageUrl: input.imageUrl,
      source: input.source,
    },
  });
}

export interface MealEstimateResult {
  estimatedCalories: number | null;
  foodDescription: string | null;
}

/** createMealCheckInで作成済みのチェックインに、AI解析結果を後から反映する。 */
export async function estimateAndUpdateMealCheckIn(
  checkInId: string,
  imageBuffer: Buffer,
  contentType: string,
): Promise<MealEstimateResult> {
  const estimate = await estimateMealCalories(imageBuffer, contentType);

  const result: MealEstimateResult = {
    estimatedCalories: estimate?.estimatedCalories ?? null,
    foodDescription: estimate?.foodDescription ?? null,
  };

  await prisma.checkIn.update({
    where: { id: checkInId },
    data: result,
  });

  return result;
}

export interface RecordWeightCheckInInput {
  userId: string;
  weightValueKg: number;
  source: CheckInSource;
}

export interface RecordWeightCheckInResult {
  checkInId: string;
  weightValueKg: number;
  weightDeltaKg: number | null;
  bmi: number;
}

/**
 * 1.2節:体重チェックイン。weightDeltaは「直近の体重報告(CheckIn)との差分」として
 * サーバー側で算出する(フロントエンド側で計算しないこと、整合性担保のため)。
 */
export async function recordWeightCheckIn(
  input: RecordWeightCheckInInput,
): Promise<RecordWeightCheckInResult> {
  const previousWeightCheckIn = await prisma.checkIn.findFirst({
    where: { userId: input.userId, type: "weight" },
    orderBy: { createdAt: "desc" },
    select: { weightValueEncrypted: true },
  });

  const previousWeightKg = previousWeightCheckIn?.weightValueEncrypted
    ? decryptNumber(previousWeightCheckIn.weightValueEncrypted)
    : null;

  const weightDeltaKg = previousWeightKg !== null ? input.weightValueKg - previousWeightKg : null;

  const checkIn = await prisma.checkIn.create({
    data: {
      userId: input.userId,
      type: "weight",
      weightValueEncrypted: encryptNumber(input.weightValueKg),
      weightDeltaEncrypted: weightDeltaKg !== null ? encryptNumber(weightDeltaKg) : null,
      source: input.source,
    },
  });

  const bmi = await updateCurrentWeight(input.userId, input.weightValueKg);

  return { checkInId: checkIn.id, weightValueKg: input.weightValueKg, weightDeltaKg, bmi };
}
