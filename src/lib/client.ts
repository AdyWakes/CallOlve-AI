/** Browser-side fetch helper for the CallOlve API. */

export class ApiClientError extends Error {
  constructor(
    message: string,
    public details?: Record<string, string[] | undefined>
  ) {
    super(message);
  }

  /** First field-level error message for a given field, if any. */
  field(name: string): string | undefined {
    return this.details?.[name]?.[0];
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = (await res.json().catch(() => null)) as
    | { data?: T; error?: { message?: string; details?: Record<string, string[]> } }
    | null;
  if (!res.ok) {
    throw new ApiClientError(
      body?.error?.message ?? `Request failed (${res.status})`,
      body?.error?.details
    );
  }
  return body?.data as T;
}

export const apiPost = <T>(path: string, data: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(data) });

export const apiPatch = <T>(path: string, data: unknown) =>
  api<T>(path, { method: "PATCH", body: JSON.stringify(data) });

export const apiDelete = <T>(path: string) => api<T>(path, { method: "DELETE" });
