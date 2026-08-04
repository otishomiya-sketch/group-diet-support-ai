# グループダイエット支援AI

個人の減量目標を起点に、日次逆算・チーム制の相互鼓舞・LINE経由での常時サポートを提供するダイエット支援アプリ。
仕様は `グループダイエット支援AI_開発指示書_v3.md`(v3)を参照。

## 技術スタック

- Next.js 16 (App Router) / TypeScript / Tailwind CSS
- Prisma 7(`@prisma/adapter-pg`)+ PostgreSQL
- NextAuth.js(Credentials, JWT)
- Claude API(コーチ人格メッセージ生成・2段階フィルタ)
- LINE Messaging API
- Supabase Storage(食事画像)

## セットアップ

```bash
cp .env.example .env
docker compose up -d
npm install
npx prisma migrate deploy
npm run dev
```

`.env` に `ANTHROPIC_API_KEY` / `LINE_CHANNEL_SECRET` / `LINE_CHANNEL_ACCESS_TOKEN` /
`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `FIELD_ENCRYPTION_KEY` を設定すること。

## バッチ処理(cron)

`CRON_SECRET` を `Authorization: Bearer <CRON_SECRET>` で渡して呼び出す。

| エンドポイント | 用途 |
|---|---|
| `POST /api/cron/bmi-matching` | BMIマッチングバッチ |
| `POST /api/cron/scheduled-message` | 定時配信(6時/11時/17時想定) |
| `POST /api/cron/individual-support` | 個別行動支援トリガー判定(日次)。安全レイヤーより先に実行すること |
| `POST /api/cron/safety-layer` | メンタルヘルス安全レイヤー検知(日次) |
| `POST /api/cron/retention` | 退会後90日経過ユーザーの食事画像削除 |

## 機微データの扱い

`height` / `gender` / `birthDate` / `currentWeight` / `targetWeight` / LINEユーザーID / 体重チェックインは
`src/lib/crypto/field-encryption.ts` によりアプリケーション層で暗号化して保存する。
`bmi` は BMIマッチングバッチでのソートに使うため例外的に平文で保持する(UI表示は本人のOptIn設定に従う)。

## 法務確認待ち・要専門家確認事項

指示書9章および`src/lib/config/feature-flags.ts`を参照。
