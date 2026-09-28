import { prisma } from "@/lib/prisma";
import { pushTextMessage } from "@/lib/line/client";
import { getLineUserIdForPush } from "@/lib/sensitive/user-profile";

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

/** テンプレートまたは自由入力文を、複数顧客へ一斉送信する。1件ずつ結果を返す。 */
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
    title: t.title,
    body: t.body,
    createdAt: t.createdAt.toISOString(),
  }));
}

export async function createSalonMessageTemplate(
  salonId: string,
  title: string,
  body: string,
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

  const template = await prisma.salonMessageTemplate.create({
    data: { salonId, title: trimmedTitle, body: trimmedBody },
  });
  return {
    id: template.id,
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
