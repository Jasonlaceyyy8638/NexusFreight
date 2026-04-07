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

type ProfileGateRow = {
  role: string;
  trial_ends_at: string | null;
  stripe_subscription_id: string | null;
};

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

  const path = request.nextUrl.pathname;
  const demoCookie = request.cookies.get(DEMO_COOKIE)?.value;
  const demoBrowsing =
    demoCookie === "dispatcher" || demoCookie === "carrier";

  async function loadProfileGate(uid: string) {
    const { data } = await supabase
      .from("profiles")
      .select("role, trial_ends_at, stripe_subscription_id")
      .eq("id", uid)
      .maybeSingle();
    return data as ProfileGateRow | null;
  }

  function accessAllowed(trial: ProfileGateRow | null) {
    const paid = Boolean(trial?.stripe_subscription_id?.trim());
    if (paid) return true;
    const ends = trial?.trial_ends_at
      ? new Date(trial.trial_ends_at).getTime()
      : null;
    if (ends == null) return true;
    return ends > Date.now();
  }

  if (!user && path.startsWith("/trial-expired")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!user && path.startsWith("/driver")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!user && path.startsWith("/dashboard")) {
    const gate = dashboardGuestGate(request);
    if (gate) return gate;
  }

  if (!user) {
    return response;
  }

  const needsProfileGate =
    !demoBrowsing &&
    (path.startsWith("/dashboard") ||
      path.startsWith("/driver") ||
      path.startsWith("/trial-expired"));

  const profile = needsProfileGate
    ? await loadProfileGate(user.id)
    : null;

  const isDriver = profile?.role === "Driver";

  if (!demoBrowsing && profile && isDriver && path.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/driver/dashboard", request.url));
  }

  if (!demoBrowsing && profile && !isDriver && path.startsWith("/driver")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (user && path.startsWith("/trial-expired")) {
    if (demoBrowsing) return response;
    if (profile != null && accessAllowed(profile)) {
      const dest = isDriver ? "/driver/dashboard" : "/dashboard";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return response;
  }

  if (
    user &&
    !demoBrowsing &&
    profile != null &&
    !accessAllowed(profile) &&
    (path.startsWith("/dashboard") || path.startsWith("/driver"))
  ) {
    return NextResponse.redirect(new URL("/trial-expired", request.url));
  }

  return response;
}
