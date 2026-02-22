/**
 * @jest-environment node
 */

/**
 * Tests for GET /api/confirm-application?token=<token>
 *
 * Covers:
 *  - Missing token → 400
 *  - Token not found / already used → 404
 *  - Happy path: finds application, flips status to pending, clears token,
 *    sends admin notification, returns 200 with applicant's first name
 *  - Directus update failure → 500
 *  - Directus search failure → 500
 *  - Admin email is sent only on success
 */

import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────
// eslint-disable-next-line no-var
var mockSendEmail: jest.Mock;

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: (...args: unknown[]) => mockSendEmail(...args) },
  })),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import route AFTER mocks
import { GET } from "@/app/api/confirm-application/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TEST_TOKEN = "abc123def456";

const mockApplication = {
  id: 7,
  name: "Jordan Lee",
  email: "jordan@example.com",
  discipline: "tech",
  why_join: "I want to understand AI fundamentally.",
  background: "Designer with 3 years of freelance work.",
  portfolio_url: "https://jordanlee.com",
};

function makeRequest(token?: string): NextRequest {
  const url = token
    ? `http://localhost/api/confirm-application?token=${token}`
    : `http://localhost/api/confirm-application`;
  return new NextRequest(url);
}

/** Directus search returns a matching application */
function searchHit() {
  return { ok: true, json: async () => ({ data: [mockApplication] }) };
}

/** Directus search returns no results (token not found / already used) */
function searchMiss() {
  return { ok: true, json: async () => ({ data: [] }) };
}

/** Directus PATCH succeeds */
function patchOk() {
  return { ok: true, json: async () => ({ data: { id: 7 } }) };
}

/** Directus PATCH fails */
function patchFail() {
  return { ok: false, text: async () => "Internal error" };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSendEmail = jest.fn().mockResolvedValue({ id: "email-ok" });
});

// ─── Missing token ────────────────────────────────────────────────────────────

describe("GET /api/confirm-application — missing token", () => {
  it("returns 400 when no token is provided", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("missing_token");
  });

  it("does not call Directus when token is missing", async () => {
    await GET(makeRequest());
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ─── Token not found / already used ──────────────────────────────────────────

describe("GET /api/confirm-application — invalid or used token", () => {
  it("returns 404 when token is not found in Directus", async () => {
    mockFetch.mockResolvedValueOnce(searchMiss());
    const res = await GET(makeRequest(TEST_TOKEN));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("invalid_or_used");
  });

  it("does not send any email when token is not found", async () => {
    mockFetch.mockResolvedValueOnce(searchMiss());
    await GET(makeRequest(TEST_TOKEN));
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("does not attempt to PATCH Directus when token is not found", async () => {
    mockFetch.mockResolvedValueOnce(searchMiss());
    await GET(makeRequest(TEST_TOKEN));
    // Only one fetch call (the search) — no PATCH
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

// ─── Happy path ───────────────────────────────────────────────────────────────

describe("GET /api/confirm-application — success", () => {
  beforeEach(() => {
    mockFetch
      .mockResolvedValueOnce(searchHit())  // search by token
      .mockResolvedValueOnce(patchOk());   // PATCH status
  });

  it("returns 200 with success true", async () => {
    const res = await GET(makeRequest(TEST_TOKEN));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns the applicant's first name", async () => {
    const res = await GET(makeRequest(TEST_TOKEN));
    const json = await res.json();
    expect(json.name).toBe("Jordan");
  });

  it("queries Directus with the correct token and awaiting_confirmation filter", async () => {
    await GET(makeRequest(TEST_TOKEN));
    const searchUrl = mockFetch.mock.calls[0][0] as string;
    expect(searchUrl).toContain("confirmation_token");
    expect(searchUrl).toContain(TEST_TOKEN);
    expect(searchUrl).toContain("awaiting_confirmation");
  });

  it("patches the application to status 'pending'", async () => {
    await GET(makeRequest(TEST_TOKEN));
    const patchBody = JSON.parse(
      (mockFetch.mock.calls[1][1] as RequestInit).body as string
    );
    expect(patchBody.status).toBe("pending");
  });

  it("clears the confirmation_token on the application", async () => {
    await GET(makeRequest(TEST_TOKEN));
    const patchBody = JSON.parse(
      (mockFetch.mock.calls[1][1] as RequestInit).body as string
    );
    expect(patchBody.confirmation_token).toBeNull();
  });

  it("patches the correct application by id", async () => {
    await GET(makeRequest(TEST_TOKEN));
    const patchUrl = mockFetch.mock.calls[1][0] as string;
    expect(patchUrl).toContain(String(mockApplication.id));
  });

  it("sends exactly one admin notification email", async () => {
    await GET(makeRequest(TEST_TOKEN));
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it("sends the admin notification to blackskymedia@gmail.com", async () => {
    await GET(makeRequest(TEST_TOKEN));
    const [call] = mockSendEmail.mock.calls;
    expect(call[0].to).toBe("blackskymedia@gmail.com");
  });

  it("admin email subject contains the applicant's name", async () => {
    await GET(makeRequest(TEST_TOKEN));
    const [call] = mockSendEmail.mock.calls;
    expect(call[0].subject).toContain(mockApplication.name);
  });
});

// ─── Directus search failure ──────────────────────────────────────────────────

describe("GET /api/confirm-application — Directus search failure", () => {
  it("returns 500 when the Directus search request fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, text: async () => "DB error" });
    const res = await GET(makeRequest(TEST_TOKEN));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("server_error");
  });

  it("does not send email when search fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, text: async () => "DB error" });
    await GET(makeRequest(TEST_TOKEN));
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

// ─── Directus PATCH failure ───────────────────────────────────────────────────

describe("GET /api/confirm-application — Directus PATCH failure", () => {
  it("returns 500 when the status update fails", async () => {
    mockFetch
      .mockResolvedValueOnce(searchHit())
      .mockResolvedValueOnce(patchFail());
    const res = await GET(makeRequest(TEST_TOKEN));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("server_error");
  });

  it("does not send admin email when PATCH fails", async () => {
    mockFetch
      .mockResolvedValueOnce(searchHit())
      .mockResolvedValueOnce(patchFail());
    await GET(makeRequest(TEST_TOKEN));
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
