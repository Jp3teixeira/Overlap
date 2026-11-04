"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

/** Cliente Supabase para o browser (uploads de imagens, por exemplo). As leituras de páginas fazem-se no servidor. */
export function createClient() {
  const { url, key } = supabaseEnv();
  return createBrowserClient(url, key);
}
