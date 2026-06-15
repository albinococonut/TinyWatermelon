// Environment helpers. Single source of truth for "are we in a usable
// runtime environment" checks so we can show friendly messages in
// previews/before Postgres is wired up.

export function isProductionRuntime(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
}

/**
 * Returns true when the DATABASE_URL points at the local SQLite dev file.
 * SQLite is fine in dev but useless on Vercel's ephemeral serverless filesystem.
 * When this is true in production, we skip showing the login/dashboard flows
 * and surface a "coming next" message instead.
 */
export function isUsingDevDatabase(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("file:") || url === "";
}

export function authReady(): boolean {
  // Auth works when (a) we're in dev OR (b) the DB is a real one
  return !isProductionRuntime() || !isUsingDevDatabase();
}
