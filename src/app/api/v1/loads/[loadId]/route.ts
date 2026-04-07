import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { driverLoadResourceFromRow } from "@/lib/api/driver-load-from-row";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import type { DriverLoadApiError, DriverLoadApiSuccess } from "@/types/api/driver-load";

export const runtime = "nodejs";

const SELECT_PUBLIC =
  "id, origin, destination, status, dispatched_at, delivered_at, driver_notified_at";

/**
 * Driver / track clients: stable JSON for loads, independent of the dashboard UI.
 *
 * - **No auth:** returns a driver-safe subset if the load exists (typical tracking link).
 * - **Authorization: Bearer &lt;supabase_access_token&gt;:** uses RLS; returns 404 if the user cannot see the load.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ loadId: string }> }
) {
  const { loadId } = await ctx.params;
  if (!loadId || typeof loadId !== "string") {
    return NextResponse.json<DriverLoadApiError>(
      { error: "Invalid load id.", code: "invalid_id" },
      { status: 400 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  const auth = req.headers.get("authorization");
  const bearer =
    auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";

  if (bearer && url && anonKey) {
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (user) {
      const { data: row, error } = await userClient
        .from("loads")
        .select(SELECT_PUBLIC)
        .eq("id", loadId)
        .maybeSingle();

      if (error) {
        return NextResponse.json<DriverLoadApiError>(
          { error: error.message, code: "database_error" },
          { status: 500 }
        );
      }
      if (!row) {
        return NextResponse.json<DriverLoadApiError>(
          { error: "Load not found.", code: "not_found" },
          { status: 404 }
        );
      }
      const body: DriverLoadApiSuccess = {
        data: driverLoadResourceFromRow(row),
      };
      return NextResponse.json(body);
    }
  }

  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    return NextResponse.json<DriverLoadApiError>(
      {
        error:
          "Server cannot read loads (configure SUPABASE_SERVICE_ROLE_KEY for public track).",
        code: "service_unavailable",
      },
      { status: 503 }
    );
  }

  const { data: row, error } = await admin
    .from("loads")
    .select(SELECT_PUBLIC)
    .eq("id", loadId)
    .maybeSingle();

  if (error) {
    return NextResponse.json<DriverLoadApiError>(
      { error: error.message, code: "database_error" },
      { status: 500 }
    );
  }
  if (!row) {
    return NextResponse.json<DriverLoadApiError>(
      { error: "Load not found.", code: "not_found" },
      { status: 404 }
    );
  }

  const body: DriverLoadApiSuccess = {
    data: driverLoadResourceFromRow(row),
  };
  return NextResponse.json(body);
}
