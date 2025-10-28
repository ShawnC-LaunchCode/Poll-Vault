/**
 * Simple test to verify the test infrastructure is working
 * This file can be deleted - it's just to confirm vitest runs
 */
import { describe, it, expect } from "vitest";

describe("Test Infrastructure", () => {
  it("should run basic tests", () => {
    expect(1 + 1).toBe(2);
  });

  it("should handle arrays", () => {
    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
    expect(arr[0]).toBe(1);
  });

  it("should handle objects", () => {
    const obj = { name: "Test", value: 123 };
    expect(obj.name).toBe("Test");
    expect(obj.value).toBe(123);
  });
});
