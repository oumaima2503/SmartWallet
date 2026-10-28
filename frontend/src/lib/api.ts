
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

// Prevent several simultaneous refresh requests
let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

function notifyAuthExpired() {
  clearApiCache();

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
}

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

  const requestOptions: RequestInit = {
    ...options,
    credentials: "include",
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  };

  async function sendRequest(): Promise<Response> {
    try {
      return await fetch(`${API_URL}${path}`, requestOptions);
    } catch {
      throw new ApiError(
        "Can't reach the server. Check your connection and that the backend is running.",
        0
      );
    }
  }

  // If another request is refreshing, wait for it.
  if (!isAuthEndpoint && refreshPromise) {
    await refreshPromise;
  }

  let response = await sendRequest();

  // Access token expired: attempt to renew the session.
  if (response.status === 401 && !isAuthEndpoint) {
    const refreshed = await refreshSession();

    if (refreshed) {
      // Retry original request once.
      response = await sendRequest();
    }

    if (response.status === 401) {
      notifyAuthExpired();
    }
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
