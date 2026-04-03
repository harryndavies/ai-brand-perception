import ky, { HTTPError } from "ky";
import { useAuthStore } from "@/stores/auth";

const ENV_URL = import.meta.env.VITE_API_URL ?? "/api";

/** Resolve to an absolute URL so ky's prefixUrl works in all environments. */
const BASE_URL = ENV_URL.startsWith("http")
  ? ENV_URL
  : `${globalThis.location?.origin ?? "http://localhost"}${ENV_URL}`;

/**
 * Pre-configured ky instance for the Perception AI backend.
 *
 * - Injects Bearer token via beforeRequest hook
 * - Handles 401 by logging out and throwing
 * - Parses backend error `detail` from response body
 * - Retries failed requests twice with exponential backoff
 * - 30 second request timeout
 */
export const api = ky.create({
  prefixUrl: BASE_URL,
  timeout: 30_000,
  retry: {
    limit: 2,
    statusCodes: [408, 500, 502, 503, 504],
  },
  hooks: {
    beforeRequest: [
      (request) => {
        const token = useAuthStore.getState().token;
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async (_request, _options, response) => {
        if (response.status === 401) {
          useAuthStore.getState().logout();
          throw new Error("Unauthorized");
        }
      },
    ],
    beforeError: [
      async (error) => {
        const { response } = error;
        if (response) {
          const body = await response.json().catch(() => null) as { detail?: string } | null;
          if (body?.detail) {
            error.message = body.detail;
          }
        }
        return error;
      },
    ],
  },
});

/**
 * Type-safe GET/POST/PUT/DELETE helpers that return parsed JSON.
 *
 * Use these in service files instead of calling `api` directly,
 * so return types are inferred.
 */
export function get<T>(path: string): Promise<T> {
  return api.get(path).json<T>();
}

export function post<T>(path: string, body: unknown): Promise<T> {
  return api.post(path, { json: body }).json<T>();
}

export function put<T>(path: string, body: unknown): Promise<T> {
  return api.put(path, { json: body }).json<T>();
}

export function del<T>(path: string): Promise<T> {
  return api.delete(path).json<T>();
}

/**
 * Create an SSE EventSource connection to the backend.
 *
 * The token is passed as a query parameter because the EventSource API
 * does not support custom headers.
 */
export function createEventSource(path: string): EventSource {
  const token = useAuthStore.getState().token;
  const url = `${BASE_URL}${path}?token=${token}`;
  return new EventSource(url);
}

/** Re-export HTTPError so services can catch it if needed. */
export { HTTPError };
