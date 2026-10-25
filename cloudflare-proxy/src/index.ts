/**
 * A24 Healthcare Multi-Agent Cloudflare Gemini Key Proxy
 * Automatically rotates across a resilient pool of Gemini API keys.
 * Advanced Error Detection:
 *  - If server is busy (503 / 500 / 429), backs off and retries with the next key in queue.
 *  - If key is wrong / revoked / quota-exhausted (400 / 403 / API_KEY_INVALID), immediately skips to the next key.
 */

export interface Env {
  GEMINI_API_KEYS?: string;
  INTERNAL_PROXY_SECRET?: string;
}

const GEMINI_API_HOST = "https://generativelanguage.googleapis.com";

// Queue pointer for round-robin rotation
let queueIndex = 0;

// Set of known bad/revoked keys to avoid retrying them repeatedly
const blacklistedKeys = new Set<string>();

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // 1. Handle CORS Preflight
    if (request.method === "OPTIONS") {
      return handleCors();
    }

    const url = new URL(request.url);

    // 2. Health & Queue Status Endpoint
    if (url.pathname === "/" || url.pathname === "/health" || url.pathname === "/queue-status") {
      const allKeys = parseKeys(env.GEMINI_API_KEYS);
      const activeKeys = allKeys.filter((k) => !blacklistedKeys.has(k));
      return jsonResponse({
        status: "operational",
        service: "A24-Gemini-Key-Rotator-Proxy",
        total_keys_in_pool: allKeys.length,
        active_healthy_keys: activeKeys.length,
        blacklisted_keys_count: blacklistedKeys.size,
        current_queue_index: queueIndex % Math.max(1, activeKeys.length),
        version: "2.0.0",
        timestamp: new Date().toISOString(),
      });
    }

    // 3. Authenticate Internal Secret (if configured)
    const expectedSecret = env.INTERNAL_PROXY_SECRET;
    if (expectedSecret && expectedSecret.trim() !== "") {
      const authHeader =
        request.headers.get("X-Internal-Proxy-Secret") ||
        request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
      if (authHeader !== expectedSecret) {
        return jsonResponse(
          { error: "Unauthorized: Invalid or missing X-Internal-Proxy-Secret header" },
          401
        );
      }
    }

    // 4. Extract API Key Queue
    let keys = parseKeys(env.GEMINI_API_KEYS);

    // Check for direct key passed in header
    const directHeaderKey = request.headers.get("X-Gemini-Direct-Key");
    if (directHeaderKey && !keys.includes(directHeaderKey)) {
      keys.unshift(directHeaderKey);
    }

    // Filter out blacklisted keys unless all keys are blacklisted (in which case reset blacklist)
    let availableKeys = keys.filter((k) => !blacklistedKeys.has(k));
    if (availableKeys.length === 0 && keys.length > 0) {
      blacklistedKeys.clear(); // Reset if all were somehow quarantined
      availableKeys = keys;
    }

    if (availableKeys.length === 0) {
      return jsonResponse(
        {
          error: "No active Gemini API keys configured. Set GEMINI_API_KEYS environment variable.",
        },
        500
      );
    }

    // Read request body once for potential multi-key retries
    let requestBody: ArrayBuffer | null = null;
    if (request.method !== "GET" && request.method !== "HEAD") {
      requestBody = await request.arrayBuffer();
    }

    // 5. Intelligent Queue Rotation & Error Recovery
    const totalQueueLength = availableKeys.length;
    const startIndex = (queueIndex++) % totalQueueLength;
    const errorLogs: Array<{ keySlot: number; keyMask: string; status: number; reason: string }> = [];

    // Attempt up to totalQueueLength tries across the pool
    for (let attempt = 0; attempt < totalQueueLength; attempt++) {
      const currentIdx = (startIndex + attempt) % totalQueueLength;
      const currentKey = availableKeys[currentIdx];
      const keyMask = `${currentKey.substring(0, 8)}...${currentKey.substring(currentKey.length - 4)}`;

      // Construct upstream Gemini URL
      const targetUrl = new URL(url.pathname, GEMINI_API_HOST);
      url.searchParams.forEach((val, k) => {
        if (k !== "key") targetUrl.searchParams.set(k, val);
      });
      targetUrl.searchParams.set("key", currentKey);

      // Clone clean headers
      const forwardHeaders = new Headers(request.headers);
      forwardHeaders.delete("X-Internal-Proxy-Secret");
      forwardHeaders.delete("X-Gemini-Direct-Key");
      forwardHeaders.delete("Host");

      try {
        const response = await fetch(targetUrl.toString(), {
          method: request.method,
          headers: forwardHeaders,
          body: requestBody ? requestBody.slice(0) : undefined,
        });

        // SUCCESS: Return stream or JSON response directly
        if (response.ok) {
          const respHeaders = new Headers(response.headers);
          respHeaders.set("Access-Control-Allow-Origin", "*");
          respHeaders.set("X-Proxy-Active-Key", keyMask);
          respHeaders.set("X-Proxy-Attempts-Used", String(attempt + 1));
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: respHeaders,
          });
        }

        // ERROR DETECTION: Read error message to determine category
        const errText = await response.clone().text();
        const isKeyError =
          response.status === 400 ||
          response.status === 403 ||
          errText.includes("API_KEY_INVALID") ||
          errText.includes("API key not valid") ||
          errText.includes("PERMISSION_DENIED");

        const isServerBusy =
          response.status === 429 ||
          response.status === 500 ||
          response.status === 503 ||
          response.status === 504 ||
          errText.includes("RESOURCE_EXHAUSTED") ||
          errText.includes("Overloaded") ||
          errText.includes("quota");

        if (isKeyError) {
          // KEY WRONG: Blacklist this key and immediately advance to the next one
          blacklistedKeys.add(currentKey);
          errorLogs.push({
            keySlot: currentIdx + 1,
            keyMask,
            status: response.status,
            reason: `INVALID KEY DETECTED (${response.status}) -> Discarding key from active queue. Error: ${errText.substring(0, 120)}`,
          });
          continue; // Try next key immediately
        }

        if (isServerBusy) {
          // SERVER BUSY / RATE LIMIT: Short backoff jitter and try next key in queue
          errorLogs.push({
            keySlot: currentIdx + 1,
            keyMask,
            status: response.status,
            reason: `SERVER BUSY / RATE LIMITED (${response.status}) -> Retrying next key in queue. Error: ${errText.substring(0, 120)}`,
          });
          await sleep(60 + attempt * 40);
          continue; // Try next key
        }

        // For non-retryable user payload errors (e.g. 400 schema error that is NOT a bad key), return response
        const respHeaders = new Headers(response.headers);
        respHeaders.set("Access-Control-Allow-Origin", "*");
        respHeaders.set("X-Proxy-Active-Key", keyMask);
        return new Response(errText, {
          status: response.status,
          headers: respHeaders,
        });
      } catch (err: any) {
        // Network / timeout error: advance to next key
        errorLogs.push({
          keySlot: currentIdx + 1,
          keyMask,
          status: 0,
          reason: `NETWORK / FETCH TIMEOUT: ${err?.message || String(err)} -> Trying next key.`,
        });
      }
    }

    // All keys in the queue were exhausted or returned busy/invalid
    return jsonResponse(
      {
        error: "All Gemini API keys in the queue were exhausted, busy, or invalid.",
        keys_attempted: totalQueueLength,
        error_logs: errorLogs,
      },
      503
    );
  },
};

function parseKeys(rawKeys?: string): string[] {
  if (!rawKeys) return [];
  return rawKeys
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function handleCors(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Internal-Proxy-Secret, X-Gemini-Direct-Key",
      "Access-Control-Max-Age": "86400",
    },
  });
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
