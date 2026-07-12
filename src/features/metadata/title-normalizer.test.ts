import { describe, expect, it } from "vitest";
import { normalizeGameTitle } from "@/features/metadata/title-normalizer";

describe("game title normalization", () => {
  it("removes region, language and patch annotations", () => {
    expect(
      normalizeGameTitle("Naruto Shippuden - Ultimate Ninja 5 (Europe) (Portuguese Patch).iso"),
    ).toBe("Naruto Shippuden Ultimate Ninja 5");
  });

  it("preserves edition names outside annotations", () => {
    expect(
      normalizeGameTitle("Need for Speed - Most Wanted - Black Edition (Europe, Australia)"),
    ).toBe("Need for Speed Most Wanted Black Edition");
  });
});
