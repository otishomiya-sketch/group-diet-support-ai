import { createClient } from "@supabase/supabase-js";

// 3.3節/7.2節:食事画像はSupabase Storageに保存。退会後90日で自動削除(バッチ、5章参照)。

const BUCKET = "meal-images";

function client() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createClient(url, serviceRoleKey);
}

export async function uploadMealImage(userId: string, buffer: Buffer, contentType: string): Promise<string> {
  const supabase = client();
  const path = `${userId}/${Date.now()}.jpg`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
  });
  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteMealImage(imageUrl: string): Promise<void> {
  const supabase = client();
  const path = extractStoragePath(imageUrl);
  if (!path) return;

  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    throw new Error(`Supabase Storage delete failed: ${error.message}`);
  }
}

function extractStoragePath(imageUrl: string): string | null {
  const marker = `/${BUCKET}/`;
  const idx = imageUrl.indexOf(marker);
  if (idx === -1) return null;
  return imageUrl.slice(idx + marker.length);
}
