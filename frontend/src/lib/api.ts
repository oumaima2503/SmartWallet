
// Development: the backend runs on its own port. Production (Vercel): leave NEXT_PUBLIC_API_URL unset,
// the calls stay on the frontend's domain (/api/...) and next.config.ts forwards them to BACKEND_URL.
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === "production" ? "" : "http://localhost:4000");

export const AUTH_EXPIRED_EVENT = "smartwallet:auth-expired";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// Existing GET response cache
const responseCache = new Map<string, unknown>();

export function peekCache<T>(
  path: string
): { data: T } | undefined {
  return responseCache.has(path)
    ? { data: responseCache.get(path) as T }
    : undefined;
}

export function clearApiCache() {
  responseCache.clear();
}

// The login is a server session: the backend keeps it in PostgreSQL and the browser only has
// an httpOnly cookie with its id. All tabs share that cookie, so there is nothing to renew here.
// A BroadcastChannel tells the other tabs when the session is over (logout, expired).
const authChannel =
  typeof window !== "undefined" && typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("smartwallet-auth")
    : null;

function notifyAuthExpired(tellOtherTabs = true) {
  clearApiCache();

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }

  if (tellOtherTabs) {
    authChannel?.postMessage("logged-out");
  }
}

// Another tab logged out or lost the session: do the same here
authChannel?.addEventListener("message", (event) => {
  if (event.data === "logged-out") {
    notifyAuthExpired(false);
  }
});

// Centralized authenticated API client
export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const isForm =
    typeof FormData !== "undefined" &&
    options.body instanceof FormData;

  const isAuthEndpoint = path.startsWith("/api/auth/");

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        ...(isForm ? {} : { "Content-Type": "application/json" }),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      "Can't reach the server. Check your connection and that the backend is running.",
      0
    );
  }

  // The session cookie is gone in this browser: the other tabs must log out too
  if (path === "/api/auth/logout") {
    authChannel?.postMessage("logged-out");
  }

  // Session expired or logged out (a wrong password on /login is also a 401, but not a logout)
  if (response.status === 401 && !isAuthEndpoint) {
    notifyAuthExpired();
  }

  // Clear GET cache after successful mutations
  if (
    response.ok &&
    method !== "GET" &&
    !path.startsWith("/api/chat")
  ) {
    clearApiCache();
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      data?.error || "Request failed",
      response.status
    );
  }

  if (method === "GET") {
    responseCache.set(path, data);
  }

  return data as T;
}
