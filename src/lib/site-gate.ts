export const UNLOCK_COOKIE = "callolve_unlock";

/**
 * Deterministic token derived from the site password. Stored in the unlock
 * cookie so the plaintext password never sits in the browser, and so the cookie
 * can't be forged without knowing the password. Uses Web Crypto, which works in
 * both edge middleware and Node route handlers.
 */
export async function unlockToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`callolve-site-gate:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
