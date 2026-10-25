export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Sent on window when the backend answers 401 (not logged in / session expired)
export const AUTH_EXPIRED_EVENT = "smartwallet:auth-expired";

// Error with the HTTP status, so pages can react differently (e.g. 503 = AI unavailable)
export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// Calls the Express backend and throws an ApiError with the backend message on failure
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  // For file uploads (FormData) the browser sets the Content-Type itself
  const isForm = options.body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      // Send the login cookie (JWT, httpOnly) to the backend
      credentials: "include",
      headers: { ...(isForm ? {} : { "Content-Type": "application/json" }), ...options.headers },
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and that the backend is running.", 0);
  }

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    // Session missing or expired: tell the AuthProvider (except for the login calls themselves)
    if (response.status === 401 && !path.startsWith("/api/auth/") && typeof window !== "undefined") {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    throw new ApiError(data?.error || "Request failed", response.status);
  }
  return data as T;
}
