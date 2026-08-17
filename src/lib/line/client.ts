import crypto from "node:crypto";

// 3.6節:LINE Messaging API連携。Webhook署名検証とPush送信の薄いラッパー。
// SDK(@line/bot-sdk)は導入せず、fetch直叩きで最小実装する。

const LINE_API_BASE = "https://api.line.me/v2/bot";
const DEFAULT_APP_URL = "https://group-diet-support-ai.vercel.app";

/** LINEから送るメッセージには必ずアプリへのリンクを添付する(運営方針)。 */
function appendAppLink(text: string): string {
  const appUrl = process.env.APP_URL ?? DEFAULT_APP_URL;
  return `${text}\n\n▼アプリはこちら\n${appUrl}/dashboard`;
}

export function verifyLineSignature(rawBody: string, signature: string | null): boolean {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret || !signature) {
    return false;
  }
  const expected = crypto.createHmac("sha256", channelSecret).update(rawBody).digest("base64");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function pushTextMessage(lineUserId: string, text: string): Promise<void> {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not set");
  }

  const res = await fetch(`${LINE_API_BASE}/message/push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [{ type: "text", text: appendAppLink(text) }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LINE push failed: ${res.status} ${body}`);
  }
}

// Webhookイベントへの応答は、月間割当のあるPush APIではなく無料のReply APIを使う
// (replyTokenはイベント受信から約1分のみ有効な使い捨てトークン)。
export async function replyTextMessage(replyToken: string, text: string): Promise<void> {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not set");
  }

  const res = await fetch(`${LINE_API_BASE}/message/reply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text: appendAppLink(text) }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LINE reply failed: ${res.status} ${body}`);
  }
}

export async function fetchLineImageContent(messageId: string): Promise<Buffer> {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not set");
  }

  const res = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`LINE image fetch failed: ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}
