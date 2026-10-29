// Client for the Flask AI service

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5000";
const TIMEOUT_MS = 90_000;
// A free Render service sleeps after 15 minutes: while it wakes up, Render answers 502/503/504 with an HTML page
const RETRIES = 3;
const RETRY_DELAY_MS = 8_000;
const KEEP_AWAKE_MS = 10 * 60 * 1000;

export class AiServiceError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function callAiService<T>(path: string, init: RequestInit): Promise<T> {
  const deadline = Date.now() + TIMEOUT_MS;

  for (let attempt = 1; ; attempt++) {
    let response: Response;
    try {
      response = await fetch(`${AI_SERVICE_URL}${path}`, {
        ...init,
        // trim(): a space or line break pasted into the hosting dashboard must not break the key
        headers: { ...init.headers, "X-Internal-Key": (process.env.INTERNAL_API_KEY || "").trim() },
        signal: AbortSignal.timeout(Math.max(deadline - Date.now(), 1_000)),
      });
    } catch {
      if (attempt < RETRIES && Date.now() + RETRY_DELAY_MS < deadline) {
        await wait(RETRY_DELAY_MS);
        continue;
      }
      throw new AiServiceError("The AI service is not running or not reachable", 503);
    }

    const data = await response.json().catch(() => null);
    if (response.ok) return data as T;

    // No JSON error from Flask = the hosting platform answered (service waking up): try again
    if (!data && [502, 503, 504].includes(response.status) && attempt < RETRIES && Date.now() + RETRY_DELAY_MS < deadline) {
      await wait(RETRY_DELAY_MS);
      continue;
    }

    // 401 = the two services don't share the same INTERNAL_API_KEY (a setup problem, not a bug)
    if (response.status === 401) {
      throw new AiServiceError("The AI service refused the backend: INTERNAL_API_KEY must be identical in both services", 503);
    }
    if (!data) {
      throw new AiServiceError("The AI service is starting up. Try again in a minute.", 503);
    }
    throw new AiServiceError(data.error || "The AI service returned an error", response.status === 503 ? 503 : 502);
  }
}

// While the backend is awake, ping the AI service so it doesn't fall asleep (only on a deployed service)
export function keepAiServiceAwake() {
  if (!process.env.AI_SERVICE_URL?.startsWith("https://")) return;
  const ping = () => fetch(`${AI_SERVICE_URL}/health`, { signal: AbortSignal.timeout(TIMEOUT_MS) }).catch(() => {});
  ping();
  setInterval(ping, KEEP_AWAKE_MS);
}
