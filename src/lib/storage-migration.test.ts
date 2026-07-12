import { beforeEach, describe, expect, it, vi } from "vitest";
import { readMigratedStorage } from "@/lib/storage-migration";

describe("local storage migration", () => {
  const values = new Map<string, string>();

  beforeEach(() => {
    values.clear();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
  });

  it("copies legacy data to the Arcadium key without deleting the source", () => {
    values.set("ludex.settings.v1", '{"theme":"light"}');

    expect(readMigratedStorage("arcadium.settings.v1", ["ludex.settings.v1"])).toBe(
      '{"theme":"light"}',
    );
    expect(values.get("arcadium.settings.v1")).toBe('{"theme":"light"}');
    expect(values.get("ludex.settings.v1")).toBe('{"theme":"light"}');
  });

  it("never overwrites data already saved by Arcadium", () => {
    values.set("arcadium.settings.v1", '{"theme":"dark"}');
    values.set("ludex.settings.v1", '{"theme":"light"}');

    expect(readMigratedStorage("arcadium.settings.v1", ["ludex.settings.v1"])).toBe(
      '{"theme":"dark"}',
    );
  });
});
