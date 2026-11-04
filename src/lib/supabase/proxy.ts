import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv, supabaseEnv } from "./env";

/** Rotas que se abrem sem sessão. */
const PUBLIC_PATHS = ["/login"];

const isPublic = (pathname: string) =>
  PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

/**
 * Corre antes de cada pedido: refresca a sessão (cookies) e redireciona.
 * É só uma verificação otimista. A verificação a sério está no getCurrentTeam() e na RLS.
 */
export async function updateSession(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    // Em desenvolvimento deixa abrir (dá para ver o /dev/ui antes de haver Supabase).
    // Em produção falha fechado.
    if (process.env.NODE_ENV === "development") return NextResponse.next({ request });
    return new NextResponse("Configuração do Supabase em falta.", { status: 500 });
  }

  const { url, key } = supabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Não pôr código entre createServerClient e getClaims: é aqui que a sessão é refrescada.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname } = request.nextUrl;

  if (!signedIn && !isPublic(pathname)) {
    return redirectKeepingCookies(request, response, "/login");
  }
  if (signedIn && pathname === "/login") {
    return redirectKeepingCookies(request, response, "/");
  }
  return response;
}

function redirectKeepingCookies(request: NextRequest, from: NextResponse, to: string) {
  const redirect = NextResponse.redirect(new URL(to, request.url));
  from.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}
