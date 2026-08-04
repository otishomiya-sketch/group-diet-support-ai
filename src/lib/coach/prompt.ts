import Anthropic from "@anthropic-ai/sdk";

// 2章:コーチ人格プロンプト設計。2階層(制約レイヤー+人格レイヤー)+出力検証(2次判定)。
// 2.2節の禁止事項は「省略・要約しないこと」と明記されているため、原文のまま埋め込む。

const CONSTRAINT_LAYER = `あなたは「鬼教官」というキャラクターとしてメッセージを生成する。以下は絶対に守るべき制約であり、
キャラクター性・口調のいかなる理由によっても違反してはならない。

1. 効果を保証する表現(「必ず」「絶対」「確実に痩せる」等)を使用しない。
2. 医学的・栄養学的な断定(「この食事は危険」「太る」等)を行わない。
3. ユーザーの体重・体型・見た目そのものへの評価をしない。評価対象は常に「行動」であり、結果ではない。
   (例外:チーム内成功体験共有メッセージ生成時のみ、体重減少量の言及を許可する。個別注記を参照)
4. 恐怖・不安を煽る表現(「このままでは一生」等)を使用しない。
5. ユーザーを個人として否定する言葉を使用しない。行動の未実施を指摘する場合も、次の行動を促す形に留める。
6. 個別化された具体的な食事指導(食材名・分量の個人向け指定)を行わない。
   食事に関する案内は、厚生労働省等の公的機関が公開する一般的な指針の範囲を超えないこと。`;

const PERSONA_LAYER = `あなたは「鬼教官」である。ユーザーを「隊員」と呼ぶ。口調は短文・断定調・命令形。
世界観として「任務」「入隊◯日目」「本日のミッション」等の語彙を用いる。`;

export type CoachMessageType =
  | "scheduled"
  | "team_share"
  | "individual_support_stage1"
  | "individual_support_stage2"
  | "safety_resource";

export interface GenerateCoachMessageInput {
  messageType: CoachMessageType;
  variables: Record<string, unknown>;
}

function client(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// 2.5節:1次生成(キャラクター性のある文章生成)は通常モデルを使用。
const PRIMARY_MODEL = "claude-sonnet-5";
// 2.5節:2次判定(禁止カテゴリ照合)はより軽量なモデルでの代替を検討可能。
const JUDGE_MODEL = "claude-haiku-4-5-20251001";

function buildUserMessage(input: GenerateCoachMessageInput): string {
  const typeInstruction: Record<CoachMessageType, string> = {
    scheduled:
      "定時配信メッセージを生成せよ。チーム達成率(集計値)を踏まえること。食事メニュー案内を含める場合は" +
      "公的ガイドライン引用のみとし、個別メニューを創作しないこと。",
    team_share:
      "チーム内成功体験共有メッセージを生成せよ。制約3の例外として体重減少量の言及を許可するが、" +
      "他ユーザーとの比較・順位付けは行わないこと。",
    individual_support_stage1:
      "個別行動支援(第1段階)メッセージを生成せよ。行動促進のみを行い、感情ケアは不要。",
    individual_support_stage2:
      "個別行動支援(第2段階・レア演出)メッセージを生成せよ。感情ケア中心のトーンに切り替え、" +
      "「ほろり」とした寄り添いの口調とすること。具体的な食事・原因分析は行わず、" +
      "感情面のケアと行動継続の呼びかけに留めること。",
    safety_resource:
      "相談窓口案内メッセージを生成せよ。断定的な診断・医学的判断は一切行わず、" +
      "変数のconsultationResourceTextに記載された相談先をそのまま案内すること。" +
      "consultationResourceTextに記載のない医療機関名・相談先を独自に創作・追加してはならない。",
  };

  return [
    typeInstruction[input.messageType],
    "",
    "変数:",
    JSON.stringify(input.variables, null, 2),
  ].join("\n");
}

export interface CoachMessageResult {
  rawOutput: string;
  filteredOutput: string;
  filterFlags: Record<string, boolean> | null;
}

const FALLBACK_MESSAGE =
  "本日のミッションを継続せよ、隊員。詳細は追ってコーチより連絡する。";

/**
 * 2.1節:1次生成→2次判定の2段階呼び出し。該当なしならrawOutputをそのまま配信、
 * 該当ありなら定型フォールバック文言に差し替える。
 */
export async function generateCoachMessage(
  input: GenerateCoachMessageInput,
): Promise<CoachMessageResult> {
  const anthropic = client();

  const primaryResponse = await anthropic.messages.create({
    model: PRIMARY_MODEL,
    max_tokens: 500,
    system: `${CONSTRAINT_LAYER}\n\n${PERSONA_LAYER}`,
    messages: [{ role: "user", content: buildUserMessage(input) }],
  });

  const rawOutput = primaryResponse.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  const judgeResponse = await anthropic.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 300,
    system:
      "以下の文章が、次の禁止カテゴリ①〜⑥のいずれかに該当するか判定せよ。" +
      "①効果保証表現 ②医学的・栄養学的断定 ③体重・体型・見た目への評価" +
      "(チーム内成功体験共有メッセージでの体重減少量の言及は例外として許可) " +
      "④恐怖・不安を煽る表現 ⑤ユーザーを個人として否定する表現 ⑥個別化された具体的な食事指導。",
    messages: [{ role: "user", content: rawOutput }],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            violates: { type: "boolean" },
            categories: { type: "array", items: { type: "string" } },
          },
          required: ["violates", "categories"],
          additionalProperties: false,
        },
      },
    },
  });

  const judgeText = judgeResponse.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  let violates = false;
  let categories: string[] = [];
  try {
    const parsed = JSON.parse(judgeText) as { violates?: boolean; categories?: string[] };
    violates = parsed.violates === true;
    categories = parsed.categories ?? [];
  } catch {
    // 判定結果がJSONとして解釈できない場合は安全側(該当あり)に倒す
    violates = true;
    categories = ["judge_parse_error"];
  }

  const filterFlags = categories.reduce<Record<string, boolean>>((acc, category) => {
    acc[category] = true;
    return acc;
  }, {});

  return {
    rawOutput,
    filteredOutput: violates ? FALLBACK_MESSAGE : rawOutput,
    filterFlags: categories.length > 0 ? filterFlags : null,
  };
}
