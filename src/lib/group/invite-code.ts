import crypto from "node:crypto";

// 紛らわしい文字(0/O, 1/I等)を除いた読み上げやすい招待コード
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const LENGTH = 8;

export function generateInviteCode(): string {
  const bytes = crypto.randomBytes(LENGTH);
  let code = "";
  for (let i = 0; i < LENGTH; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}
