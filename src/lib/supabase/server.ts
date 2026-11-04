import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Cria um novo por pedido (nunca reutilizar entre pedidos).
 * Lê cookies: com cacheComponents, só pode ser chamado dentro de um <Suspense>.
 * TODO(0.5): depois de `npm run db:types`, passar o tipo: createServerClient<Database>(...)
 */
export async function createClient() {
  const { url, key } = supabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado a partir de um Server Component, onde não se pode escrever cookies.
          // Não faz mal: o proxy refresca a sessão em cada pedido.
        }
      },
    },
  });
}
