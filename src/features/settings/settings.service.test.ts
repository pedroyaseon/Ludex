import { beforeEach, describe, expect, it, vi } from "vitest";

describe("execution settings migration", () => {
  const values = new Map<string, string>();

  beforeEach(() => {
    values.clear();
    vi.resetModules();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
      dispatchEvent: vi.fn(),
    });
  });

  it("uses the most recently updated legacy profile as the global default", async () => {
    values.set(
      "arcadium.launchProfiles.v1",
      JSON.stringify([
        {
          fullscreen: false,
          customArgs: "--old",
          resolutionPreset: "2x",
          controllerProfile: "classic",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          fullscreen: true,
          customArgs: "--nogui",
          resolutionPreset: "4x",
          controllerProfile: "dualshock",
          updatedAt: "2026-07-01T00:00:00.000Z",
        },
      ]),
    );

    const { settingsService } = await import("@/features/settings/settings.service");
    const settings = await settingsService.get();

    expect(settings.execution).toEqual({
      fullscreen: true,
      customArgs: "--nogui",
      resolutionPreset: "4x",
      controllerProfile: "dualshock",
    });
  });
});
