import { prisma } from "@/lib/prisma";
import { decryptNumber } from "@/lib/crypto/field-encryption";
import { getConfig } from "@/lib/config/system-config";
import { sendCoachMessage } from "@/lib/coach/persist";
import { pushCoachMessageToUser } from "@/lib/notify/push-coach-message";

const HISTORY_LOOKBACK = 30;

/**
 * 3.4節(v3):停滞回数 = 直近の連続する「体重報告があった回のうち、増加または変化なし」の回数。
 * 報告間隔はweightReportFrequencyにより異なるため、日数ではなく報告回数を単位とする。
 * 常にCheckIn履歴から再計算する(増分カウンタを持たない)ことで、報告が飛んだ場合や
 * 途中で減少が挟まった場合でも正しく「連続」を再判定できる。
 */
async function countConsecutiveNonLoss(userId: string): Promise<number> {
  const weightCheckIns = await prisma.checkIn.findMany({
    where: { userId, type: "weight" },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LOOKBACK,
    select: { weightDeltaEncrypted: true },
  });

  let count = 0;
  for (const checkIn of weightCheckIns) {
    if (!checkIn.weightDeltaEncrypted) break; // 初回報告(差分なし)で打ち切り
    const delta = decryptNumber(checkIn.weightDeltaEncrypted);
    if (delta >= 0) {
      count += 1;
    } else {
      break;
    }
  }
  return count;
}

export async function runIndividualSupportBatch(): Promise<{ evaluated: number; fired: number }> {
  const thresholdsByFrequency = await getConfig("stagnation.thresholdsByFrequency");

  const users = await prisma.user.findMany({
    where: { withdrawnAt: null },
    select: { id: true, weightReportFrequency: true, createdAt: true },
  });

  let fired = 0;

  for (const user of users) {
    const consecutiveNonLoss = await countConsecutiveNonLoss(user.id);
    const thresholds =
      thresholdsByFrequency[user.weightReportFrequency] ?? thresholdsByFrequency.daily;

    const state = await prisma.stagnationState.upsert({
      where: { userId: user.id },
      create: { userId: user.id, consecutiveNonLoss, lastReportedAt: new Date() },
      update: { consecutiveNonLoss, lastReportedAt: new Date() },
    });

    if (consecutiveNonLoss === 0 && (state.stage1FiredAt || state.stage2FiredAt)) {
      await prisma.stagnationState.update({
        where: { userId: user.id },
        data: { stage1FiredAt: null, stage2FiredAt: null },
      });
      continue;
    }

    if (consecutiveNonLoss >= thresholds.stage1Count && !state.stage1FiredAt) {
      const message = await sendCoachMessage({
        messageType: "individual_support_stage1",
        userId: user.id,
        variables: { stagnationCount: consecutiveNonLoss },
      });
      await prisma.stagnationState.update({
        where: { userId: user.id },
        data: { stage1FiredAt: new Date() },
      });
      await pushCoachMessageToUser(user.id, message.filteredOutput);
      fired += 1;
    }

    if (
      consecutiveNonLoss >= thresholds.stage2Count &&
      state.stage1FiredAt &&
      !state.stage2FiredAt
    ) {
      const tenureDays = Math.floor(
        (Date.now() - user.createdAt.getTime()) / (24 * 60 * 60 * 1000),
      );
      const message = await sendCoachMessage({
        messageType: "individual_support_stage2",
        userId: user.id,
        variables: { stagnationCount: consecutiveNonLoss, tenureDays },
      });
      await prisma.stagnationState.update({
        where: { userId: user.id },
        data: { stage2FiredAt: new Date(), stage2FireCount: { increment: 1 } },
      });
      await pushCoachMessageToUser(user.id, message.filteredOutput);
      fired += 1;
    }
  }

  return { evaluated: users.length, fired };
}
