/** Thin client for the demo's own `/api/*` routes (served by the Vite
 *  plugin, which runs the server-to-server SDK with the API key). */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = (data as { error?: unknown }).error;
    throw new Error(typeof e === "string" ? e : JSON.stringify(e ?? data));
  }
  return data as T;
}
