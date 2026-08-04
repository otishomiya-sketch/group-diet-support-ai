import Anthropic from "@anthropic-ai/sdk";

// 食事画像からのカロリー概算(0.2節の不採用方針を見直し、運営判断により採用)。
// あくまで概算値であり、断定的な栄養指導は行わない(2.2節の制約思想を踏襲)。

export interface CalorieEstimate {
  estimatedCalories: number;
  foodDescription: string;
  confidence: "low" | "medium" | "high";
}

const MODEL = "claude-sonnet-5";

function toMediaType(contentType: string): "image/jpeg" | "image/png" | "image/gif" | "image/webp" {
  if (contentType === "image/png") return "image/png";
  if (contentType === "image/gif") return "image/gif";
  if (contentType === "image/webp") return "image/webp";
  return "image/jpeg";
}

export async function estimateMealCalories(
  imageBuffer: Buffer,
  contentType: string,
): Promise<CalorieEstimate | null> {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: toMediaType(contentType),
                data: imageBuffer.toString("base64"),
              },
            },
            {
              type: "text",
              text:
                "この食事画像に写っている料理・食品の概要と、おおよそのカロリー(kcal)を推定してください。" +
                "これは記録用の概算値であり、断定的な栄養診断ではないことを踏まえて推定してください。",
            },
          ],
        },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              foodDescription: { type: "string" },
              estimatedCalories: { type: "integer" },
              confidence: { type: "string", enum: ["low", "medium", "high"] },
            },
            required: ["foodDescription", "estimatedCalories", "confidence"],
            additionalProperties: false,
          },
        },
      },
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    return JSON.parse(text) as CalorieEstimate;
  } catch {
    // 推定失敗時はnullを返す。チェックイン自体は成立させ、推定値なしで記録する。
    return null;
  }
}
