import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const DEMO_COOKIE = "nexus_demo_mode" as const;

/** Anonymous access to /dashboard: ?demo= sets cookie; valid cookie allows entry. */
function dashboardGuestGate(request: NextRequest): NextResponse | null {
  if (!request.nextUrl.pathname.startsWith("/dashboard")) return null;

  const demoParam = request.nextUrl.searchParams.get("demo");
  if (demoParam === "dispatcher" || demoParam === "carrier") {
    const clean = request.nextUrl.clone();
    clean.searchParams.delete("demo");
    const res = NextResponse.redirect(clean);
    res.cookies.set(DEMO_COOKIE, demoParam, {
      path: "/",
      maxAge: 60 * 60 * 8,
      sameSite: "lax",
    });
    return res;
  }
  const demoCookie = request.cookies.get(DEMO_COOKIE)?.value;
  if (demoCookie === "dispatcher" || demoCookie === "carrier") {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL("/", request.url));
}

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    const gate = dashboardGuestGate(request);
    return gate ?? NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const gate = dashboardGuestGate(request);
    if (gate) return gate;
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
