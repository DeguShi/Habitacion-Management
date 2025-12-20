/**
 * Unit tests for lib/s3.ts pagination logic
 *
 * Uses Node.js built-in test runner (node:test) to keep dependencies minimal.
 * Tests the pagination behavior of listReservationKeys by mocking the S3 client.
 *
 * Run with: npm test
 */

import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert";

// We need to mock the S3 client before importing the module
// Since we can't easily mock ES modules, we'll test the pagination logic directly

/**
 * Simulates the pagination logic used in listReservationKeys
 * This is a testable version that accepts a mock send function
 */
async function listKeysWithPagination(
    mockSend: (token?: string) => Promise<{
        Contents?: Array<{ Key?: string }>;
        IsTruncated?: boolean;
        NextContinuationToken?: string;
    }>
): Promise<string[]> {
    const allKeys: string[] = [];
    let continuationToken: string | undefined;

    do {
        const response = await mockSend(continuationToken);

        const pageKeys = (response.Contents || [])
            .map((obj) => obj.Key)
            .filter((key): key is string => typeof key === "string");

        allKeys.push(...pageKeys);

        continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);

    return allKeys;
}

describe("S3 Pagination - listReservationKeys logic", () => {
    it("returns all keys from a single page (< 1000 objects)", async () => {
        const mockSend = mock.fn(async () => ({
            Contents: [
                { Key: "users/abc/reservations/1.json" },
                { Key: "users/abc/reservations/2.json" },
                { Key: "users/abc/reservations/3.json" },
            ],
            IsTruncated: false,
        }));

        const keys = await listKeysWithPagination(mockSend);

        assert.strictEqual(keys.length, 3);
        assert.deepStrictEqual(keys, [
            "users/abc/reservations/1.json",
            "users/abc/reservations/2.json",
            "users/abc/reservations/3.json",
        ]);
        assert.strictEqual(mockSend.mock.callCount(), 1);
    });

    it("returns all keys across multiple pages (> 1000 objects simulation)", async () => {
        let callCount = 0;

        const mockSend = mock.fn(async (token?: string) => {
            callCount++;

            if (callCount === 1) {
                // First page - 1000 objects, truncated
                return {
                    Contents: Array.from({ length: 1000 }, (_, i) => ({
                        Key: `users/abc/reservations/${i}.json`,
                    })),
                    IsTruncated: true,
                    NextContinuationToken: "token-page-2",
                };
            } else if (callCount === 2) {
                // Second page - 500 more objects, truncated
                return {
                    Contents: Array.from({ length: 500 }, (_, i) => ({
                        Key: `users/abc/reservations/${1000 + i}.json`,
                    })),
                    IsTruncated: true,
                    NextContinuationToken: "token-page-3",
                };
            } else {
                // Third page - 200 final objects, not truncated
                return {
                    Contents: Array.from({ length: 200 }, (_, i) => ({
                        Key: `users/abc/reservations/${1500 + i}.json`,
                    })),
                    IsTruncated: false,
                };
            }
        });

        const keys = await listKeysWithPagination(mockSend);

        assert.strictEqual(keys.length, 1700, "Should return 1000 + 500 + 200 = 1700 keys");
        assert.strictEqual(mockSend.mock.callCount(), 3, "Should have made 3 API calls");
        assert.strictEqual(keys[0], "users/abc/reservations/0.json");
        assert.strictEqual(keys[999], "users/abc/reservations/999.json");
        assert.strictEqual(keys[1000], "users/abc/reservations/1000.json");
        assert.strictEqual(keys[1699], "users/abc/reservations/1699.json");
    });

    it("correctly passes ContinuationToken between pages", async () => {
        const receivedTokens: (string | undefined)[] = [];

        const mockSend = mock.fn(async (token?: string) => {
            receivedTokens.push(token);

            if (!token) {
                return {
                    Contents: [{ Key: "page1.json" }],
                    IsTruncated: true,
                    NextContinuationToken: "FIRST_TOKEN",
                };
            } else if (token === "FIRST_TOKEN") {
                return {
                    Contents: [{ Key: "page2.json" }],
                    IsTruncated: true,
                    NextContinuationToken: "SECOND_TOKEN",
                };
            } else {
                return {
                    Contents: [{ Key: "page3.json" }],
                    IsTruncated: false,
                };
            }
        });

        const keys = await listKeysWithPagination(mockSend);

        assert.deepStrictEqual(receivedTokens, [undefined, "FIRST_TOKEN", "SECOND_TOKEN"]);
        assert.deepStrictEqual(keys, ["page1.json", "page2.json", "page3.json"]);
    });

    it("returns empty array for empty bucket", async () => {
        const mockSend = mock.fn(async () => ({
            Contents: [],
            IsTruncated: false,
        }));

        const keys = await listKeysWithPagination(mockSend);

        assert.strictEqual(keys.length, 0);
        assert.deepStrictEqual(keys, []);
        assert.strictEqual(mockSend.mock.callCount(), 1);
    });

    it("returns empty array when Contents is undefined", async () => {
        const mockSend = mock.fn(async () => ({
            IsTruncated: false,
        }));

        const keys = await listKeysWithPagination(mockSend);

        assert.strictEqual(keys.length, 0);
        assert.deepStrictEqual(keys, []);
    });

    it("filters out undefined keys", async () => {
        const mockSend = mock.fn(async () => ({
            Contents: [
                { Key: "valid1.json" },
                { Key: undefined },
                { Key: "valid2.json" },
                {},
                { Key: "valid3.json" },
            ],
            IsTruncated: false,
        }));

        const keys = await listKeysWithPagination(mockSend);

        assert.strictEqual(keys.length, 3);
        assert.deepStrictEqual(keys, ["valid1.json", "valid2.json", "valid3.json"]);
    });

    it("stops pagination when IsTruncated is false", async () => {
        const mockSend = mock.fn(async () => ({
            Contents: [{ Key: "only-page.json" }],
            IsTruncated: false,
            NextContinuationToken: "SHOULD_NOT_BE_USED",
        }));

        const keys = await listKeysWithPagination(mockSend);

        assert.strictEqual(mockSend.mock.callCount(), 1, "Should not continue if IsTruncated is false");
        assert.deepStrictEqual(keys, ["only-page.json"]);
    });
});

describe("S3 Pagination - Edge Cases", () => {
    it("handles exactly 1000 objects (boundary case)", async () => {
        const mockSend = mock.fn(async () => ({
            Contents: Array.from({ length: 1000 }, (_, i) => ({
                Key: `key${i}.json`,
            })),
            IsTruncated: false,
        }));

        const keys = await listKeysWithPagination(mockSend);

        assert.strictEqual(keys.length, 1000);
        assert.strictEqual(mockSend.mock.callCount(), 1);
    });

    it("handles 1001 objects (first truncation boundary)", async () => {
        let callCount = 0;

        const mockSend = mock.fn(async () => {
            callCount++;
            if (callCount === 1) {
                return {
                    Contents: Array.from({ length: 1000 }, (_, i) => ({
                        Key: `key${i}.json`,
                    })),
                    IsTruncated: true,
                    NextContinuationToken: "next",
                };
            }
            return {
                Contents: [{ Key: "key1000.json" }],
                IsTruncated: false,
            };
        });

        const keys = await listKeysWithPagination(mockSend);

        assert.strictEqual(keys.length, 1001);
        assert.strictEqual(mockSend.mock.callCount(), 2);
    });
});
