import crypto from "node:crypto";

// 機微データ(7.3節)のアプリケーション層暗号化。
// User.height/gender/birthDate/currentWeight/targetWeight、CheckIn.weightValue/weightDelta、
// lineUserIdの読み書きは必ずこのモジュール経由で行い、生の値をDBに書き込まないこと。

const ALGORITHM = "aes-256-gcm";

function deriveKey(purpose: "encryption" | "blind-index"): Buffer {
  const secret = process.env.FIELD_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      "FIELD_ENCRYPTION_KEY is not set. 機微データの暗号化キーが未設定です(.env参照)。",
    );
  }
  return crypto.createHash("sha256").update(`${secret}:${purpose}`).digest();
}

export function encryptField(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, deriveKey("encryption"), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((buf) => buf.toString("base64")).join(".");
}

export function decryptField(payload: string): string {
  const [ivB64, authTagB64, ciphertextB64] = payload.split(".");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Invalid encrypted field payload");
  }
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  const decipher = crypto.createDecipheriv(ALGORITHM, deriveKey("encryption"), iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

/** 完全一致検索用のブラインドインデックス(HMAC、一方向)。LINEユーザーIDのlookupに使用。 */
export function hashForLookup(value: string): string {
  return crypto.createHmac("sha256", deriveKey("blind-index")).update(value.trim()).digest("hex");
}

export function encryptNumber(value: number): string {
  return encryptField(value.toString());
}

export function decryptNumber(payload: string): number {
  return Number(decryptField(payload));
}

export function encryptDate(value: Date): string {
  return encryptField(value.toISOString());
}

export function decryptDate(payload: string): Date {
  return new Date(decryptField(payload));
}
