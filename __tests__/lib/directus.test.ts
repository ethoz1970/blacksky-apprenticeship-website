/**
 * @jest-environment node
 */

/**
 * Tests for lib/directus.ts — getCourses()
 *
 * Strategy: mock @directus/sdk (no outer variable references in factory),
 * then use jest.spyOn on the exported directus client to control request responses.
 */

jest.mock("@directus/sdk", () => ({
  createDirectus: jest.fn().mockReturnValue({
    with: jest.fn().mockReturnThis(),
    request: jest.fn().mockResolvedValue([]),
  }),
  rest: jest.fn(),
  readItems: jest.fn((collection: string, options: unknown) => ({
    __collection: collection,
    __options: options,
  })),
}));

import directusClient, { getCourses } from "@/lib/directus";
import { readItems } from "@directus/sdk";

const mockCourses = [
  { id: 1, name: "LLM 101", discipline: "tech", status: "published", description: "Intro", date_created: "2024-01-01" },
  { id: 2, name: "Media Foundations", discipline: "media", status: "published", description: "Stories", date_created: "2024-01-02" },
];

let mockRequest: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockRequest = jest.spyOn(directusClient, "request").mockResolvedValue([]);
});

// ─── Success ──────────────────────────────────────────────────────────────────

describe("getCourses — success", () => {
  it("returns an array of courses", async () => {
    mockRequest.mockResolvedValueOnce(mockCourses);
    const result = await getCourses();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("LLM 101");
    expect(result[1].discipline).toBe("media");
  });

  it("returns an empty array when no courses are published", async () => {
    mockRequest.mockResolvedValueOnce([]);
    const result = await getCourses();
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it("handles a single course correctly", async () => {
    mockRequest.mockResolvedValueOnce([mockCourses[0]]);
    const result = await getCourses();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it("passes all returned fields through unchanged", async () => {
    mockRequest.mockResolvedValueOnce(mockCourses);
    const result = await getCourses();
    const course = result[0];
    expect(course).toHaveProperty("id");
    expect(course).toHaveProperty("name");
    expect(course).toHaveProperty("discipline");
    expect(course).toHaveProperty("status");
    expect(course).toHaveProperty("description");
  });
});

// ─── Query correctness ────────────────────────────────────────────────────────

describe("getCourses — query", () => {
  it("calls directus.request once", async () => {
    await getCourses();
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it("passes the readItems result to request", async () => {
    await getCourses();
    expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({ __collection: "classes" }));
  });

  it("requests items from the 'classes' collection", async () => {
    await getCourses();
    const readItemsCall = (readItems as jest.Mock).mock.calls[0];
    expect(readItemsCall[0]).toBe("classes");
  });

  it("filters by status = 'published'", async () => {
    await getCourses();
    const readItemsCall = (readItems as jest.Mock).mock.calls[0];
    expect(readItemsCall[1].filter).toEqual({ status: { _eq: "published" } });
  });

  it("sorts results by name", async () => {
    await getCourses();
    const readItemsCall = (readItems as jest.Mock).mock.calls[0];
    expect(readItemsCall[1].sort).toContain("name");
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe("getCourses — error handling", () => {
  it("returns [] when the request throws a network error", async () => {
    mockRequest.mockRejectedValueOnce(new Error("Network error"));
    const result = await getCourses();
    expect(result).toEqual([]);
  });

  it("returns [] when the SDK throws", async () => {
    mockRequest.mockRejectedValueOnce(new TypeError("SDK error"));
    const result = await getCourses();
    expect(Array.isArray(result)).toBe(true);
  });

  it("never throws — always resolves", async () => {
    mockRequest.mockRejectedValueOnce(new Error("Crash"));
    await expect(getCourses()).resolves.toBeDefined();
  });
});
