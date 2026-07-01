/**
 * Typed (de)serializers for JSON-as-string columns.
 *
 * SQLite (dev) has no native JSON type, so structured payloads are stored as
 * serialized strings. These helpers are the only sanctioned way to read/write
 * them — they never throw on malformed data, they return the fallback instead.
 * After migrating to PostgreSQL `jsonb`, only this file changes.
 */

export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function toJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}
