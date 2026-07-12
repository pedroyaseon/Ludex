import { igdbProvider } from "@/features/metadata/providers/igdb/igdb.provider";
import { rawgProvider } from "@/features/metadata/providers/rawg/rawg.provider";
import type { MetadataRequest } from "@/features/metadata/providers/metadata-provider";
import type {
  IgdbMetadataResult,
  ProviderBundle,
  RawgMetadataResult,
} from "@/features/metadata/metadata.types";
import { normalizeGameTitle } from "@/features/metadata/title-normalizer";
import type { ComposedGameMetadata, GameArtwork, GameVideo } from "@/types/domain";

const igdbImageUrl = (imageId: string, size: "cover_big" | "screenshot_big" = "cover_big") =>
  `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`;

const youtubeVideo = (externalId: string, title?: string): GameVideo => ({
  provider: "youtube",
  externalId,
  title,
  watchUrl: `https://www.youtube.com/watch?v=${externalId}`,
  embedUrl: `https://www.youtube.com/embed/${externalId}`,
  thumbnailUrl: `https://img.youtube.com/vi/${externalId}/hqdefault.jpg`,
});

export const composeMetadata = (
  bundle: ProviderBundle,
  existing?: ComposedGameMetadata,
  legacyCover?: string,
): ComposedGameMetadata | undefined => {
  const { rawg, igdb } = bundle;
  if (!rawg && !igdb && !existing && !legacyCover) return undefined;
  const igdbCover: GameArtwork | undefined = igdb?.cover
    ? {
        provider: "igdb",
        type: "cover",
        imageUrl: igdbImageUrl(igdb.cover.imageId),
        width: igdb.cover.width,
        height: igdb.cover.height,
      }
    : undefined;
  const legacy: GameArtwork | undefined = legacyCover
    ? { provider: "manual", type: "cover", imageUrl: legacyCover }
    : undefined;
  const background: GameArtwork | undefined = igdb?.artworks[0]
    ? {
        provider: "igdb",
        type: "background",
        imageUrl: igdbImageUrl(igdb.artworks[0].imageId, "screenshot_big"),
      }
    : rawg?.backgroundUrl
      ? { provider: "rawg", type: "background", imageUrl: rawg.backgroundUrl }
      : existing?.background;
  const screenshots: GameArtwork[] = rawg?.screenshots.length
    ? rawg.screenshots.map((item) => ({ provider: "rawg", type: "screenshot", ...item }))
    : (igdb?.artworks.map((item) => ({
        provider: "igdb",
        type: "screenshot",
        imageUrl: igdbImageUrl(item.imageId, "screenshot_big"),
        width: item.width,
        height: item.height,
      })) ??
      existing?.screenshots ??
      []);
  const releaseDate = igdb?.releaseTimestamp
    ? new Date(igdb.releaseTimestamp * 1000).toISOString().slice(0, 10)
    : (rawg?.releasedAt ?? existing?.releaseDate);
  return {
    schemaVersion: 3,
    title: igdb?.title ?? rawg?.title ?? existing?.title ?? "",
    description: igdb?.summary ?? rawg?.description ?? existing?.description,
    summary: igdb?.summary ?? existing?.summary,
    releaseDate,
    releaseYear: releaseDate ? Number(releaseDate.slice(0, 4)) : existing?.releaseYear,
    genres: igdb?.genres.length
      ? igdb.genres
      : rawg?.genres.length
        ? rawg.genres
        : (existing?.genres ?? []),
    developers: igdb?.developers.length
      ? igdb.developers
      : rawg?.developers.length
        ? rawg.developers
        : (existing?.developers ?? []),
    publishers: igdb?.publishers.length
      ? igdb.publishers
      : rawg?.publishers.length
        ? rawg.publishers
        : (existing?.publishers ?? []),
    rating: igdb?.rating ?? rawg?.rating ?? existing?.rating,
    metacritic: igdb?.metacritic ?? rawg?.metacritic ?? existing?.metacritic,
    cover: igdbCover ?? existing?.cover ?? legacy,
    background,
    screenshots,
    videos:
      igdb?.videos.map((item) => youtubeVideo(item.externalId, item.title)) ??
      existing?.videos ??
      [],
    rawgId: rawg?.rawgId ?? existing?.rawgId,
    igdbId: igdb?.igdbId ?? existing?.igdbId,
    rawgUrl: rawg?.rawgUrl ?? existing?.rawgUrl,
    metadataUpdatedAt: new Date().toISOString(),
  };
};

export const metadataService = {
  async configuration() {
    const [rawg, igdb] = await Promise.all([
      rawgProvider.isConfigured().catch(() => false),
      igdbProvider.isConfigured().catch(() => false),
    ]);
    return { rawg, igdb };
  },
  async fetch(request: MetadataRequest): Promise<ProviderBundle> {
    const normalized = { ...request, title: normalizeGameTitle(request.title) };
    const configured = await this.configuration();
    const tasks: Array<
      Promise<{ provider: "rawg" | "igdb"; value: RawgMetadataResult | IgdbMetadataResult | null }>
    > = [];
    if (configured.rawg)
      tasks.push(rawgProvider.fetch(normalized).then((value) => ({ provider: "rawg", value })));
    if (configured.igdb)
      tasks.push(igdbProvider.fetch(normalized).then((value) => ({ provider: "igdb", value })));
    const settled = await Promise.allSettled(tasks);
    const bundle: ProviderBundle = { errors: [] };
    for (const result of settled) {
      if (result.status === "rejected") {
        bundle.errors.push(
          result.reason instanceof Error ? result.reason.message : String(result.reason),
        );
        continue;
      }
      if (result.value.provider === "rawg")
        bundle.rawg = result.value.value as RawgMetadataResult | undefined;
      else bundle.igdb = result.value.value as IgdbMetadataResult | undefined;
    }
    return bundle;
  },
};
