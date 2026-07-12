export type Platform = "PS2" | "PS3";
export type MetadataStatus = "pending" | "matched" | "not_found" | "error";
export type MetadataProviderName = "rawg" | "igdb" | "manual";

export interface GameArtwork {
  provider: MetadataProviderName;
  type: "cover" | "background" | "screenshot";
  imageUrl: string;
  localPath?: string;
  width?: number;
  height?: number;
}

export interface GameVideo {
  provider: "youtube" | "external";
  externalId: string;
  title?: string;
  thumbnailUrl?: string;
  watchUrl?: string;
  embedUrl?: string;
}

export interface ComposedGameMetadata {
  schemaVersion?: number;
  title: string;
  description?: string;
  summary?: string;
  releaseDate?: string;
  releaseYear?: number;
  genres: string[];
  developers: string[];
  publishers: string[];
  rating?: number;
  metacritic?: number;
  cover?: GameArtwork;
  background?: GameArtwork;
  screenshots: GameArtwork[];
  videos: GameVideo[];
  rawgId?: number;
  igdbId?: number;
  rawgUrl?: string;
  metadataUpdatedAt?: string;
}

export interface Game {
  id: string;
  title: string;
  platform: Platform;
  filePath: string;
  fileName: string;
  fileExtension: string;
  coverUrl?: string;
  coverLocalPath?: string;
  description?: string;
  releaseYear?: number;
  genre?: string;
  region?: string;
  serial?: string;
  developer?: string;
  publisher?: string;
  releasedAt?: string;
  rating?: number;
  metacritic?: number;
  metadataSource?: "RAWG" | "IGDB" | "COMPOSED";
  metadataExternalId?: string;
  metadataStatus?: MetadataStatus;
  metadataLastAttemptAt?: string;
  metadataUpdatedAt?: string;
  metadataError?: string;
  rawgUrl?: string;
  metadata?: ComposedGameMetadata;
  lastPlayedAt?: string;
  playtimeSeconds: number;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Emulator {
  id: string;
  name: string;
  platform: Platform;
  executablePath?: string;
  defaultArgs?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryFolder {
  id: string;
  platform: Platform;
  folderPath: string;
  recursiveScan: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LaunchProfile {
  id: string;
  gameId: string;
  emulatorId: string;
  fullscreen: boolean;
  customArgs?: string;
  resolutionPreset?: string;
  controllerProfile?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlaySession {
  id: string;
  gameId: string;
  emulatorId: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  exitCode?: number;
}
