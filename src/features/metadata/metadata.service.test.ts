import { describe, expect, it } from "vitest";
import { composeMetadata } from "@/features/metadata/metadata.service";
import { metadataCacheService } from "@/features/metadata/metadata-cache.service";
import type { ProviderBundle } from "@/features/metadata/metadata.types";

const rawg = {
  rawgId: 1,
  title: "God of War II",
  description: "RAWG description",
  releasedAt: "2007-03-13",
  backgroundUrl: "https://media.rawg.io/background.jpg",
  screenshots: [{ imageUrl: "https://media.rawg.io/screenshot.jpg" }],
  genres: ["Action"],
  developers: ["Santa Monica Studio"],
  publishers: ["Sony"],
  rawgUrl: "https://rawg.io/games/god-of-war-ii",
};
const igdb = {
  igdbId: 2,
  title: "God of War II",
  summary: "IGDB summary",
  genres: [],
  developers: [],
  publishers: [],
  cover: { imageId: "cover123", width: 264, height: 374 },
  artworks: [{ imageId: "art123" }],
  videos: [{ externalId: "youtube123", title: "Trailer" }],
  confidence: 1,
};

describe("metadata composition", () => {
  it("prefers IGDB cover and RAWG screenshots/background", () => {
    const result = composeMetadata({ rawg, igdb, errors: [] });
    expect(result?.cover?.provider).toBe("igdb");
    expect(result?.cover?.imageUrl).toContain("t_cover_big/cover123.jpg");
    expect(result?.background?.provider).toBe("rawg");
    expect(result?.screenshots[0].provider).toBe("rawg");
    expect(result?.description).toBe("IGDB summary");
    expect(result?.schemaVersion).toBe(2);
  });

  it("maps IGDB video references to safe YouTube URLs", () => {
    const result = composeMetadata({ igdb, errors: [] });
    expect(result?.videos[0].watchUrl).toBe("https://www.youtube.com/watch?v=youtube123");
    expect(result?.videos[0].thumbnailUrl).toContain("img.youtube.com");
  });

  it("keeps old metadata when both providers fail", () => {
    const existing = composeMetadata({ rawg, igdb, errors: [] });
    const result = composeMetadata({ errors: ["offline"] }, existing);
    expect(result?.cover).toEqual(existing?.cover);
    expect(result?.screenshots).toEqual(existing?.screenshots);
  });

  it("migrates a legacy cover without deleting it", () => {
    const result = composeMetadata(
      { errors: [] } satisfies ProviderBundle,
      undefined,
      "https://legacy.example/cover.jpg",
    );
    expect(result?.cover?.provider).toBe("manual");
  });
});

describe("metadata cache", () => {
  it("accepts fresh cache and rejects expired cache", () => {
    expect(metadataCacheService.isFresh(new Date().toISOString())).toBe(true);
    expect(metadataCacheService.isFresh("2020-01-01T00:00:00.000Z")).toBe(false);
  });
});
