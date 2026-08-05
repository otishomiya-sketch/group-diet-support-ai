import { NextResponse } from "next/server";

import { verifyLineSignature, replyTextMessage, fetchLineImageContent } from "@/lib/line/client";
import { findUserIdByLineUserId, setLineUserId } from "@/lib/sensitive/user-profile";
import { recordMealCheckIn, recordWeightCheckIn } from "@/lib/checkin/record-checkin";
import { uploadMealImage } from "@/lib/storage/meal-images";

// 3.6節:LINE Messaging APIのWebhookで画像・体重報告を受信 → アプリ側DBへ統合。
// 友だち追加(アカウント連携)は任意。連携は「link:<userId>」というテキストメッセージで行う
// (マイページで表示する連携コードをLINEトークに送ってもらう簡易フロー)。
//
// すべての受信メッセージに対して必ず何かしらの返信を送る(無反応にしない)。
// replyTokenは受信から短時間しか有効でないため、1イベントにつき1回のみ使う。

interface LineEvent {
  type: string;
  source?: { userId?: string };
  message?: { id: string; type: string; text?: string };
  replyToken?: string;
}

const LINK_TEXT_PATTERN = /^link:(.+)$/;
// 「70.5」「70.5kg」「体重70.5kg」「70.5 ㎏」など、ゆるい体重報告フォーマットを許容する。
// 誤検出を避けるため、メッセージ全体が短く(先頭の「体重」+数値+単位のみ)であることを要求する。
const WEIGHT_TEXT_PATTERN = /^(?:体重)?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:kg|ｋｇ|㎏|キロ)?$/i;
const PLAUSIBLE_WEIGHT_RANGE = { min: 20, max: 300 };

function normalizeText(text: string): string {
  // 全角数字・全角ドットを半角化してから判定する。
  return text
    .trim()
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[．。]/g, ".");
}

const HELP_MESSAGE =
  "メッセージありがとうございます。\n" +
  "体重を記録するには、数字だけ送ってください(例:70.5)。\n" +
  "食事を記録するには、写真をそのまま送ってください。";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature");

  if (!verifyLineSignature(rawBody, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as { events?: LineEvent[] };
  const events = body.events ?? [];

  await Promise.allSettled(events.map(handleLineEvent));

  return NextResponse.json({ ok: true });
}

async function handleLineEvent(event: LineEvent): Promise<void> {
  const lineUserId = event.source?.userId;
  if (!lineUserId || event.type !== "message" || !event.message) return;

  try {
    await routeLineMessage(event, lineUserId);
  } catch (error) {
    console.error("LINE webhook event handling failed", error);
    if (event.replyToken) {
      await replyTextMessage(
        event.replyToken,
        "申し訳ありません、処理中にエラーが発生しました。しばらくしてからもう一度お試しください。",
      ).catch(() => {});
    }
  }
}

async function routeLineMessage(event: LineEvent, lineUserId: string): Promise<void> {
  const message = event.message!;
  const replyToken = event.replyToken;

  if (message.type === "text" && message.text) {
    const text = normalizeText(message.text);

    const linkMatch = text.match(LINK_TEXT_PATTERN);
    if (linkMatch) {
      const result = await setLineUserId(linkMatch[1], lineUserId);
      if (!replyToken) return;
      if (result === "already_linked_elsewhere") {
        await replyTextMessage(
          replyToken,
          "このLINEアカウントは既に別のアプリアカウントに連携済みです。連携し直したい場合は、正しいアカウントでログインし、マイページの設定画面に表示される連携コードを送ってください。",
        );
      } else if (result === "user_not_found") {
        await replyTextMessage(
          replyToken,
          "連携コードが正しくないようです。マイページの設定画面から表示される最新のコードをコピーして送ってください。",
        );
      } else {
        await replyTextMessage(replyToken, "LINE連携が完了しました。");
      }
      return;
    }

    const weightMatch = text.match(WEIGHT_TEXT_PATTERN);
    if (weightMatch) {
      const weightValueKg = Number(weightMatch[1]);
      if (weightValueKg < PLAUSIBLE_WEIGHT_RANGE.min || weightValueKg > PLAUSIBLE_WEIGHT_RANGE.max) {
        if (replyToken) {
          await replyTextMessage(replyToken, HELP_MESSAGE);
        }
        return;
      }

      const userId = await findUserIdByLineUserId(lineUserId);
      if (!userId) {
        if (replyToken) {
          await replyTextMessage(
            replyToken,
            "まだこのLINEアカウントは連携されていません。マイページの設定画面から連携を行ってください。",
          );
        }
        return;
      }

      const result = await recordWeightCheckIn({ userId, weightValueKg, source: "line" });
      if (!replyToken) return;

      const deltaText =
        result.weightDeltaKg !== null
          ? result.weightDeltaKg <= 0
            ? `(前回から${Math.abs(result.weightDeltaKg).toFixed(1)}kg減少)`
            : `(前回から${result.weightDeltaKg.toFixed(1)}kg増加)`
          : "";
      await replyTextMessage(
        replyToken,
        `体重 ${weightValueKg.toFixed(1)}kg を記録しました${deltaText}。お疲れさまです!`,
      );
      return;
    }

    if (replyToken) {
      await replyTextMessage(replyToken, HELP_MESSAGE);
    }
    return;
  }

  if (message.type === "image") {
    const userId = await findUserIdByLineUserId(lineUserId);
    if (!userId) {
      if (replyToken) {
        await replyTextMessage(
          replyToken,
          "まだこのLINEアカウントは連携されていません。マイページの設定画面から連携を行ってください。",
        );
      }
      return;
    }

    const imageBuffer = await fetchLineImageContent(message.id);
    const imageUrl = await uploadMealImage(userId, imageBuffer, "image/jpeg");
    const checkIn = await recordMealCheckIn({
      userId,
      imageUrl,
      imageBuffer,
      contentType: "image/jpeg",
      source: "line",
    });

    if (!replyToken) return;
    if (checkIn.estimatedCalories != null) {
      await replyTextMessage(
        replyToken,
        `食事を記録しました。${checkIn.foodDescription ?? ""} / 推定 ${checkIn.estimatedCalories}kcal(AIによる概算です)`,
      );
    } else {
      await replyTextMessage(
        replyToken,
        "食事を記録しました。(カロリーの推定はできませんでした)",
      );
    }
    return;
  }

  if (replyToken) {
    await replyTextMessage(replyToken, HELP_MESSAGE);
  }
}
