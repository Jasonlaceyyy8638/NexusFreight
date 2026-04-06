/** Read Mapbox public token from env (any supported name). Safe on server and at next.config load time. */
export function resolveMapboxTokenFromProcessEnv(): string {
  return (
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ||
    process.env.MAPBOX_ACCESS_TOKEN?.trim() ||
    process.env.MAPBOX_TOKEN?.trim() ||
    ""
  );
}
