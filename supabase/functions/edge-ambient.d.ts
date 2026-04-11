/**
 * Ambient types for Supabase Edge (Deno). Root tsconfig excludes this folder;
 * `/// <reference path="../edge-ambient.d.ts" />` in each function entry pulls these in.
 */
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(
    handler: (req: Request) => Response | Promise<Response>
  ): void;
};

declare module "https://esm.sh/@supabase/supabase-js@2.49.1" {
  /** No generated DB schema in Edge; loose typing keeps `.from().insert()` usable. */
  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: Record<string, unknown>
  ): any;
}
