// Client for the Flask AI service

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5000";
const TIMEOUT_MS = 90_000;

export class AiServiceError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

export async function callAiService<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${AI_SERVICE_URL}${path}`, {
      ...init,
      // trim(): a space or line break pasted into the hosting dashboard must not break the key
      headers: { ...init.headers, "X-Internal-Key": (process.env.INTERNAL_API_KEY || "").trim() },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new AiServiceError("The AI service is not running or not reachable", 503);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    // 401 = the two services don't share the same INTERNAL_API_KEY (a setup problem, not a bug)
    if (response.status === 401) {
      throw new AiServiceError("The AI service refused the backend: INTERNAL_API_KEY must be identical in both services", 503);
    }
    throw new AiServiceError(data?.error || "The AI service returned an error", response.status === 503 ? 503 : 502);
  }
  return data as T;
}
