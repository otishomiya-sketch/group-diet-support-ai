import { NextResponse } from "next/server";

import { requireSessionUserId, isErrorResponse } from "@/lib/auth-helpers";
import { recordMealCheckIn, recordWeightCheckIn } from "@/lib/checkin/record-checkin";
import { uploadMealImage } from "@/lib/storage/meal-images";

function parseNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

// 3.3節:日次チェックイン(アプリ経由)。送信回数の制限は設けない。
export async function POST(request: Request) {
  const session = await requireSessionUserId();
  if (isErrorResponse(session)) return session;

  const body = await request.json().catch(() => null);
  const type = body?.type;

  if (type === "weight") {
    const weightValueKg = parseNumber(body?.weightValueKg);
    if (!weightValueKg || weightValueKg <= 0) {
      return NextResponse.json({ error: "体重は正の数値で入力してください。" }, { status: 400 });
    }
    const result = await recordWeightCheckIn({
      userId: session.userId,
      weightValueKg,
      source: "app",
    });
    return NextResponse.json({ ok: true, result });
  }

  if (type === "meal") {
    const imageBase64 = typeof body?.imageBase64 === "string" ? body.imageBase64 : "";
    const contentType = typeof body?.contentType === "string" ? body.contentType : "image/jpeg";
    if (!imageBase64) {
      return NextResponse.json({ error: "画像データが必要です。" }, { status: 400 });
    }
    const buffer = Buffer.from(imageBase64, "base64");
    const imageUrl = await uploadMealImage(session.userId, buffer, contentType);
    const checkIn = await recordMealCheckIn({
      userId: session.userId,
      imageUrl,
      imageBuffer: buffer,
      contentType,
      source: "app",
    });
    return NextResponse.json({ ok: true, checkIn });
  }

  return NextResponse.json({ error: "typeは weight または meal を指定してください。" }, { status: 400 });
}
