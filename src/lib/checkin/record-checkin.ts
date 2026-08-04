import { prisma } from "@/lib/prisma";
import { decryptNumber, encryptNumber } from "@/lib/crypto/field-encryption";
import { updateCurrentWeight } from "@/lib/sensitive/user-profile";
import { triggerWeightShareIfApplicable } from "@/lib/group/weight-share";

export type CheckInSource = "line" | "app";

export interface RecordMealCheckInInput {
  userId: string;
  imageUrl: string;
  source: CheckInSource;
}

/** 3.3節:食事画像チェックイン。送信回数の制限は設けない。 */
export async function recordMealCheckIn(input: RecordMealCheckInInput) {
  return prisma.checkIn.create({
    data: {
      userId: input.userId,
      type: "meal",
      imageUrl: input.imageUrl,
      source: input.source,
    },
  });
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
 * 3.4節:weightDelta<0 の場合はチーム共有トリガーをリアルタイムで評価する。
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

  if (weightDeltaKg !== null && weightDeltaKg < 0) {
    await triggerWeightShareIfApplicable(input.userId, weightDeltaKg);
  }

  return { checkInId: checkIn.id, weightValueKg: input.weightValueKg, weightDeltaKg, bmi };
}
