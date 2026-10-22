const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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
      headers: { ...(isForm ? {} : { "Content-Type": "application/json" }), ...options.headers },
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and that the backend is running.", 0);
  }

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(data?.error || "Request failed", response.status);
  }
  return data as T;
}
