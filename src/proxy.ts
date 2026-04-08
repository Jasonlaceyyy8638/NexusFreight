import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { profileHasWorkspaceLink } from "@/lib/dashboard/workspace-access";
import {
  stripeSubscriptionAllowsAccess,
} from "@/lib/stripe/subscription-access";

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
  org_id: string | null;
  trial_ends_at: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_status: string | null;
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
      .select(
        "role, org_id, trial_ends_at, stripe_subscription_id, stripe_subscription_status"
      )
      .eq("id", uid)
      .maybeSingle();
    return data as ProfileGateRow | null;
  }

  function accessAllowed(profile: ProfileGateRow | null) {
    if (!profile) return false;
    const subId = profile.stripe_subscription_id?.trim();
    if (subId) {
      return stripeSubscriptionAllowsAccess(
        subId,
        profile.stripe_subscription_status
      );
    }
    const ends = profile.trial_ends_at
      ? new Date(profile.trial_ends_at).getTime()
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

  if (
    !demoBrowsing &&
    profile &&
    !isDriver &&
    !profileHasWorkspaceLink(profile) &&
    path.startsWith("/dashboard")
  ) {
    if (profile.stripe_subscription_id?.trim()) {
      return NextResponse.redirect(new URL("/auth/provisioning", request.url));
    }
    const planCookie = request.cookies.get("nexus_signup_plan")?.value;
    const plan = planCookie === "yearly" ? "yearly" : "monthly";
    return NextResponse.redirect(
      new URL(`/auth/complete-subscription?plan=${plan}`, request.url)
    );
  }

  if (!demoBrowsing && profile && isDriver && path.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/driver/dashboard", request.url));
  }

  if (!demoBrowsing && profile && !isDriver && path.startsWith("/driver")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // /trial-expired must render for users without access (e.g. canceled subscription).
  // Only bounce to dashboard when accessAllowed is true — avoids a redirect loop.
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

  const stripeConfigured = Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      (process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY?.trim() ||
        process.env.STRIPE_PRICE_ID?.trim() ||
        process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY?.trim())
  );

  if (
    user &&
    !demoBrowsing &&
    stripeConfigured &&
    profile != null &&
    profile.role !== "Driver" &&
    !profile.stripe_subscription_id?.trim() &&
    accessAllowed(profile) &&
    path.startsWith("/dashboard")
  ) {
    return NextResponse.redirect(
      new URL("/auth/complete-subscription", request.url)
    );
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/driver/:path*", "/trial-expired/:path*"],
};
