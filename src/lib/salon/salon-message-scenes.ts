// サロンからのLINEメッセージ定型文を分類する利用シーン。
// サーバー(デフォルトテンプレートの自動作成・バリデーション)とクライアント(選択UI)の両方で使う。
export const SALON_MESSAGE_SCENES = [
  { value: "visit_thanks", label: "来店後のお礼" },
  { value: "next_visit", label: "次回来店の促進" },
  { value: "campaign", label: "キャンペーン案内" },
  { value: "winback", label: "久しぶりのお客様へ" },
  { value: "birthday", label: "誕生日・記念日" },
  { value: "general", label: "その他" },
] as const;

export type SalonMessageScene = (typeof SALON_MESSAGE_SCENES)[number]["value"];

const SCENE_LABELS = new Map(SALON_MESSAGE_SCENES.map((s) => [s.value, s.label]));

export function salonMessageSceneLabel(scene: string): string {
  return SCENE_LABELS.get(scene as SalonMessageScene) ?? "その他";
}

export function isSalonMessageScene(value: string): value is SalonMessageScene {
  return SCENE_LABELS.has(value as SalonMessageScene);
}
