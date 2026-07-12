import type { ComposedGameMetadata, GameArtwork, GameVideo } from "@/types/domain";

export interface RawgMetadataResult {
  rawgId: number;
  title: string;
  description?: string;
  releasedAt?: string;
  backgroundUrl?: string;
  screenshots: Array<{ imageUrl: string; width?: number; height?: number }>;
  genres: string[];
  developers: string[];
  publishers: string[];
  rating?: number;
  metacritic?: number;
  rawgUrl: string;
}

export interface IgdbMetadataResult {
  igdbId: number;
  title: string;
  summary?: string;
  releaseTimestamp?: number;
  genres: string[];
  developers: string[];
  publishers: string[];
  cover?: { imageId: string; width?: number; height?: number };
  artworks: Array<{ imageId: string; width?: number; height?: number }>;
  videos: Array<{ externalId: string; title?: string }>;
  confidence: number;
}

export interface ProviderBundle {
  rawg?: RawgMetadataResult;
  igdb?: IgdbMetadataResult;
  errors: string[];
}
export type MetadataComposition = ComposedGameMetadata;
export type { GameArtwork, GameVideo };
