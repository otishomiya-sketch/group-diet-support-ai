import { prisma } from "@/lib/prisma";
import { pushTextMessage } from "@/lib/line/client";
import { getLineUserIdForPush } from "@/lib/sensitive/user-profile";
import { isSalonMessageScene, type SalonMessageScene } from "@/lib/salon/salon-message-scenes";

export const MAX_MESSAGE_LENGTH = 1000;

export type SendSalonMessageResult =
  | { ok: true }
  | { ok: false; error: string };

/** スタッフから1名の顧客へLINEメッセージを送信する。失敗理由は握りつぶさず呼び出し元に返す。 */
export async function sendSalonMessageToCustomer(
  customerUserId: string,
  text: string,
): Promise<SendSalonMessageResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: "メッセージを入力してください。" };
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `メッセージは${MAX_MESSAGE_LENGTH}文字以内で入力してください。` };
  }

  const lineUserId = await getLineUserIdForPush(customerUserId);
  if (!lineUserId) {
    return { ok: false, error: "この顧客はLINE連携が完了していません。" };
  }

  try {
    await pushTextMessage(lineUserId, trimmed);
    return { ok: true };
  } catch {
    return { ok: false, error: "LINEへの送信に失敗しました。" };
  }
}

export interface BulkSendOutcome {
  customerUserId: string;
  ok: boolean;
  error?: string;
}

/** 自由入力文(テンプレートから引用して編集したものも含む)を、複数顧客へ一斉送信する。1件ずつ結果を返す。 */
export async function sendSalonMessageBulk(
  customerUserIds: string[],
  text: string,
): Promise<BulkSendOutcome[]> {
  const results: BulkSendOutcome[] = [];
  for (const customerUserId of customerUserIds) {
    const result = await sendSalonMessageToCustomer(customerUserId, text);
    results.push({ customerUserId, ok: result.ok, error: result.ok ? undefined : result.error });
  }
  return results;
}

export interface SalonMessageTemplateItem {
  id: string;
  scene: string;
  title: string;
  body: string;
  createdAt: string;
}

export async function getSalonMessageTemplates(salonId: string): Promise<SalonMessageTemplateItem[]> {
  const templates = await prisma.salonMessageTemplate.findMany({
    where: { salonId },
    orderBy: { createdAt: "desc" },
  });
  return templates.map((t) => ({
    id: t.id,
    scene: t.scene,
    title: t.title,
    body: t.body,
    createdAt: t.createdAt.toISOString(),
  }));
}

export async function createSalonMessageTemplate(
  salonId: string,
  title: string,
  body: string,
  scene: string,
): Promise<SalonMessageTemplateItem> {
  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();
  if (!trimmedTitle) {
    throw new Error("テンプレート名を入力してください。");
  }
  if (!trimmedBody) {
    throw new Error("本文を入力してください。");
  }
  if (trimmedBody.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`本文は${MAX_MESSAGE_LENGTH}文字以内で入力してください。`);
  }
  const resolvedScene: SalonMessageScene = isSalonMessageScene(scene) ? scene : "general";

  const template = await prisma.salonMessageTemplate.create({
    data: { salonId, scene: resolvedScene, title: trimmedTitle, body: trimmedBody },
  });
  return {
    id: template.id,
    scene: template.scene,
    title: template.title,
    body: template.body,
    createdAt: template.createdAt.toISOString(),
  };
}

export async function deleteSalonMessageTemplate(salonId: string, templateId: string): Promise<boolean> {
  const result = await prisma.salonMessageTemplate.deleteMany({
    where: { id: templateId, salonId },
  });
  return result.count > 0;
}

// サロン開設時に、利用シーンごとの叩き台となる定型文を自動で用意しておく(運営判断)。
// スタッフはこれを編集・削除したり、独自のテンプレートを追加したりできる。
const DEFAULT_TEMPLATES: { scene: SalonMessageScene; title: string; body: string }[] = [
  {
    scene: "visit_thanks",
    title: "来店後のお礼",
    body: "本日はご来店いただき誠にありがとうございました。施術後のお肌の様子はいかがでしょうか?何か気になる点がございましたら、お気軽にご連絡くださいませ。",
  },
  {
    scene: "next_visit",
    title: "次回のご来店のご案内",
    body: "前回のご来店から少しお時間が経ちました。効果を維持するためにも、そろそろ次回の施術のご予約はいかがでしょうか?ご都合の良い日程をお知らせください。",
  },
  {
    scene: "campaign",
    title: "キャンペーンのご案内",
    body: "只今、期間限定のキャンペーンを実施中です。この機会にぜひご利用ください。詳細やご予約はスタッフまでお気軽にお問い合わせください。",
  },
  {
    scene: "winback",
    title: "ご無沙汰しているお客様へ",
    body: "しばらくご来店がないようでしたので、ご連絡させていただきました。お変わりございませんか?またお会いできますことを、スタッフ一同楽しみにしております。",
  },
  {
    scene: "birthday",
    title: "誕生日・記念日のお祝い",
    body: "お誕生日、誠におめでとうございます。日頃のご愛顧に感謝を込めて、次回ご来店時に特別なメニューをご用意しております。ぜひこの機会にお越しくださいませ。",
  },
];

export async function createDefaultSalonMessageTemplates(salonId: string): Promise<void> {
  await prisma.salonMessageTemplate.createMany({
    data: DEFAULT_TEMPLATES.map((t) => ({ salonId, scene: t.scene, title: t.title, body: t.body })),
  });
}
