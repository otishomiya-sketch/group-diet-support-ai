import { NextResponse } from "next/server";

import { verifyLineSignature, pushTextMessage, fetchLineImageContent } from "@/lib/line/client";
import { findUserIdByLineUserId, setLineUserId } from "@/lib/sensitive/user-profile";
import { recordMealCheckIn, recordWeightCheckIn } from "@/lib/checkin/record-checkin";
import { uploadMealImage } from "@/lib/storage/meal-images";

// 3.6節:LINE Messaging APIのWebhookで画像・体重報告を受信 → アプリ側DBへ統合。
// 友だち追加(アカウント連携)は任意。連携は「link:<userId>」というテキストメッセージで行う
// (マイページで表示する連携コードをLINEトークに送ってもらう簡易フロー)。

interface LineEvent {
  type: string;
  source?: { userId?: string };
  message?: { id: string; type: string; text?: string };
  replyToken?: string;
}

const WEIGHT_TEXT_PATTERN = /^(?:体重)?\s*([0-9]+(?:\.[0-9]+)?)\s*kg?$/i;
const LINK_TEXT_PATTERN = /^link:(.+)$/;

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature");

  if (!verifyLineSignature(rawBody, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as { events?: LineEvent[] };
  const events = body.events ?? [];

  await Promise.all(events.map(handleLineEvent));

  return NextResponse.json({ ok: true });
}

async function handleLineEvent(event: LineEvent): Promise<void> {
  const lineUserId = event.source?.userId;
  if (!lineUserId || event.type !== "message" || !event.message) return;

  if (event.message.type === "text" && event.message.text) {
    const linkMatch = event.message.text.trim().match(LINK_TEXT_PATTERN);
    if (linkMatch) {
      await setLineUserId(linkMatch[1], lineUserId);
      await pushTextMessage(lineUserId, "LINE連携が完了しました。").catch(() => {});
      return;
    }

    const weightMatch = event.message.text.trim().match(WEIGHT_TEXT_PATTERN);
    if (weightMatch) {
      const userId = await findUserIdByLineUserId(lineUserId);
      if (!userId) return;
      await recordWeightCheckIn({
        userId,
        weightValueKg: Number(weightMatch[1]),
        source: "line",
      });
      return;
    }
  }

  if (event.message.type === "image") {
    const userId = await findUserIdByLineUserId(lineUserId);
    if (!userId) return;
    const imageBuffer = await fetchLineImageContent(event.message.id);
    const imageUrl = await uploadMealImage(userId, imageBuffer, "image/jpeg");
    await recordMealCheckIn({ userId, imageUrl, source: "line" });
  }
}
