import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAuthStore } from "@/stores/auth";

// Must mock fetch before importing modules that use ky
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const { createEventSource } = await import("../api");
const auth = await import("@/services/auth");
const reports = await import("@/services/reports");

function mockResponse(data: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce(
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("api client", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    useAuthStore.getState().logout();
    localStorage.clear();
  });

  it("sends auth header when token exists", async () => {
    const user = { id: "1", email: "a@b.com", name: "T", team: "D", has_api_key: false, api_keys: [] };
    useAuthStore.getState().setAuth(user, "my-token");
    mockResponse(user);

    await auth.getMe();

    const request = mockFetch.mock.calls[0][0] as Request;
    expect(request.headers.get("Authorization")).toBe("Bearer my-token");
  });

  it("does not send auth header when no token", async () => {
    mockResponse({ user: {}, token: "t" });

    await auth.login("a@b.com", "pass");

    const request = mockFetch.mock.calls[0][0] as Request;
    expect(request.headers.get("Authorization")).toBeNull();
  });

  it("calls logout on 401 response", async () => {
    const user = { id: "1", email: "a@b.com", name: "T", team: "D", has_api_key: false, api_keys: [] };
    useAuthStore.getState().setAuth(user, "my-token");
    mockResponse(null, 401);

    await expect(auth.getMe()).rejects.toThrow();
    expect(useAuthStore.getState().token).toBeNull();
  });

  it("throws with detail from error body", async () => {
    mockResponse({ detail: "Rate limit exceeded" }, 429);
    await expect(reports.listReports()).rejects.toThrow("Rate limit exceeded");
  });

  it("throws generic message when error body has no detail", async () => {
    mockResponse({}, 500);
    await expect(reports.listReports()).rejects.toThrow();
  });

  it("auth.signup sends correct payload", async () => {
    let capturedBody: string | undefined;
    mockFetch.mockImplementationOnce(async (req: Request) => {
      capturedBody = await req.clone().text();
      return new Response(JSON.stringify({ user: { id: "1" }, token: "t" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    await auth.signup("Name", "a@b.com", "pass123");

    const request = mockFetch.mock.calls[0][0] as Request;
    expect(request.url).toContain("/auth/signup");
    expect(JSON.parse(capturedBody!)).toEqual({
      name: "Name",
      email: "a@b.com",
      password: "pass123",
    });
  });

  it("reports.create sends brand and competitors", async () => {
    let capturedBody: string | undefined;
    mockFetch.mockImplementationOnce(async (req: Request) => {
      capturedBody = await req.clone().text();
      return new Response(JSON.stringify({ id: "r1", brand: "Nike" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    await reports.createReport("Nike", ["Adidas"], ["claude-sonnet"]);

    const request = mockFetch.mock.calls[0][0] as Request;
    expect(request.url).toContain("/reports");
    expect(JSON.parse(capturedBody!)).toEqual({
      brand: "Nike",
      competitors: ["Adidas"],
      models: ["claude-sonnet"],
    });
  });

  it("createEventSource builds URL with token", () => {
    const user = { id: "1", email: "a@b.com", name: "T", team: "D", has_api_key: false, api_keys: [] };
    useAuthStore.getState().setAuth(user, "stream-token");

    const originalEventSource = globalThis.EventSource;
    let capturedUrl = "";
    globalThis.EventSource = class {
      constructor(url: string) {
        capturedUrl = url;
      }
    } as unknown as typeof EventSource;

    createEventSource("/reports/report-123/stream");
    expect(capturedUrl).toContain("/reports/report-123/stream?token=stream-token");

    globalThis.EventSource = originalEventSource;
  });
});
