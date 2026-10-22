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
      headers: { ...init.headers, "X-Internal-Key": process.env.INTERNAL_API_KEY || "" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new AiServiceError("The AI service is not running or not reachable", 503);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new AiServiceError(data?.error || "The AI service returned an error", response.status === 503 ? 503 : 502);
  }
  return data as T;
}
