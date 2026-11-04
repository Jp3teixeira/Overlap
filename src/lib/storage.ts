import "server-only";
import { createClient } from "@/lib/supabase/server";
import { MEDIA_BUCKET, SIGNED_URL_SECONDS } from "./media-path";

/** Ficheiros do bucket privado: URLs assinados e remoção. Só no servidor. */

/**
 * URLs assinados (1 h) para vários caminhos de uma vez: path → url.
 * As fotos são opcionais: se o Storage falhar, devolve vazio em vez de partir a página.
 */
export async function signMediaUrls(paths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (paths.length === 0) return urls;
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (error) {
    console.error("[storage] signMediaUrls:", error.message);
    return urls;
  }
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return urls;
}

/** Apaga um ficheiro. Falhar aqui não é grave (fica um ficheiro órfão), por isso só regista no log. */
export async function removeMedia(path: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);
  if (error) console.error("[storage] removeMedia:", error.message);
}
