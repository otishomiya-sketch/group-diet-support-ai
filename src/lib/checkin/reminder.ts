import { prisma } from "@/lib/prisma";
import { pushTextMessage } from "@/lib/line/client";
import { getLineUserIdForPush } from "@/lib/sensitive/user-profile";

// LINE連携済みユーザーに対して能動的に体重・食事の報告を促すバッチ群。
// 朝(体重)・夜(食事+体重の再促し)の3本立てで、①LINE Botが受信メッセージへの
// 応答しかしなかった、②サービス活用の導線が弱いというフィードバックを受けて追加。

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isToday(d: Date | null | undefined): boolean {
  return !!d && toDateKey(d) === toDateKey(new Date());
}

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
}

/** weightReportFrequency(毎日/2〜3日に1回/週1回)を踏まえ、今日が報告日かどうか。 */
function isReportDueToday(frequency: string, lastWeightCheckInAt: Date | null): boolean {
  if (!lastWeightCheckInAt) return true;
  const days = daysSince(lastWeightCheckInAt);
  if (frequency === "weekly") return days >= 7;
  if (frequency === "every_2_3_days") return days >= 2;
  return days >= 1;
}

interface LineLinkedUser {
  id: string;
  weightReportFrequency: string;
}

async function getLineLinkedActiveUsers(): Promise<LineLinkedUser[]> {
  return prisma.user.findMany({
    where: { lineUserIdHash: { not: null }, withdrawnAt: null },
    select: { id: true, weightReportFrequency: true },
  });
}

async function getLastCheckInAt(userId: string, type: "weight" | "meal"): Promise<Date | null> {
  const checkIn = await prisma.checkIn.findFirst({
    where: { userId, type },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return checkIn?.createdAt ?? null;
}

async function pushToUser(userId: string, message: string): Promise<boolean> {
  const lineUserId = await getLineUserIdForPush(userId);
  if (!lineUserId) return false;
  await pushTextMessage(lineUserId, message).catch(() => {});
  return true;
}

/**
 * 1ユーザーの処理失敗(復号エラー等)でバッチ全体が止まらないよう、ユーザー単位で
 * 例外を握りつぶしてログに残すラッパー。
 */
async function runPerUser(
  users: LineLinkedUser[],
  shouldSend: (user: LineLinkedUser) => Promise<boolean>,
  message: string,
): Promise<{ sent: number }> {
  let sent = 0;

  for (const user of users) {
    try {
      if (!(await shouldSend(user))) continue;
      if (await pushToUser(user.id, message)) sent += 1;
    } catch (error) {
      console.error(`Reminder batch failed for user ${user.id}`, error);
    }
  }

  return { sent };
}

const MORNING_WEIGHT_MESSAGE =
  "おはようございます。今朝の体重を報告してください(例:70.5)。";
const EVENING_MEAL_MESSAGE =
  "本日摂取したものを、すべて写真で報告してください(何回でも送れます)。";
const NIGHT_WEIGHT_MESSAGE = "就寝前に、本日の体重を報告してください(例:70.5)。";

/** 朝:体重報告の頻度設定に従い、今日が報告日でまだ報告していない人にのみ送る。 */
export async function runMorningWeightReminderBatch(): Promise<{ sent: number }> {
  const users = await getLineLinkedActiveUsers();
  return runPerUser(
    users,
    async (user) => {
      const lastWeightAt = await getLastCheckInAt(user.id, "weight");
      if (isToday(lastWeightAt)) return false;
      return isReportDueToday(user.weightReportFrequency, lastWeightAt);
    },
    MORNING_WEIGHT_MESSAGE,
  );
}

/** 夜(食事):報告頻度に関わらず、今日まだ食事の記録がない人に一日一回だけ促す。 */
export async function runEveningMealReminderBatch(): Promise<{ sent: number }> {
  const users = await getLineLinkedActiveUsers();
  return runPerUser(
    users,
    async (user) => {
      const lastMealAt = await getLastCheckInAt(user.id, "meal");
      return !isToday(lastMealAt);
    },
    EVENING_MEAL_MESSAGE,
  );
}

/**
 * 就寝前(体重):「毎日」報告を選んでいる人のみ対象。
 * 朝に既に報告済みならここでは送らない(二重の督促にしない)。
 */
export async function runNightWeightReminderBatch(): Promise<{ sent: number }> {
  const users = await getLineLinkedActiveUsers();
  return runPerUser(
    users,
    async (user) => {
      if (user.weightReportFrequency !== "daily") return false;
      const lastWeightAt = await getLastCheckInAt(user.id, "weight");
      return !isToday(lastWeightAt);
    },
    NIGHT_WEIGHT_MESSAGE,
  );
}
