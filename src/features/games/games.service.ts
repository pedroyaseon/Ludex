import type { ScanResult, ScannedFile } from "@/features/library-scanner/scanner.types";
import { scannerService } from "@/features/library-scanner/scanner.service";
import { databaseService } from "@/features/database/database.service";
import { composeMetadata, metadataService } from "@/features/metadata/metadata.service";
import { normalizeGameTitle } from "@/features/metadata/title-normalizer";
import { settingsService } from "@/features/settings/settings.service";
import type { Game, Platform } from "@/types/domain";

export interface GameQuery {
  search?: string;
  platform?: Platform | "ALL";
  favoritesOnly?: boolean;
}

export interface LibrarySyncResult {
  scanResult: ScanResult;
  games: Game[];
  state: LibraryState;
  stats: LibrarySyncStats;
}

export interface LibrarySyncStats {
  added: number;
  updated: number;
  removed: number;
  total: number;
}

export interface LibraryState {
  totalGames: number;
  lastSyncedAt?: string;
  lastScannedFolderPath?: string;
  lastScannedPlatform?: Platform;
  lastScanDurationMilliseconds?: number;
  lastIgnoredCount?: number;
  lastSyncStats?: LibrarySyncStats;
}

interface ImportScanOptions {
  pruneMissingFromSource?: boolean;
}

const wait = (milliseconds = 180) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

const normalizeForSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR");

const normalizePathForCompare = (path: string) =>
  path.replaceAll("\\", "/").replace(/\/+$/g, "").toLocaleLowerCase("pt-BR");

const isInsideFolder = (filePath: string, folderPath: string) => {
  const normalizedFilePath = normalizePathForCompare(filePath);
  const normalizedFolderPath = normalizePathForCompare(folderPath);

  return (
    normalizedFilePath === normalizedFolderPath ||
    normalizedFilePath.startsWith(`${normalizedFolderPath}/`)
  );
};

const stableGameId = (filePath: string) => {
  let hash = 5381;
  for (const character of filePath.toLocaleLowerCase("pt-BR")) {
    hash = (hash * 33) ^ character.charCodeAt(0);
  }

  return `game-${(hash >>> 0).toString(16)}`;
};

const titleFromFile = (file: ScannedFile) =>
  file.fileName
    .replace(new RegExp(`${file.extension.replace(".", "\\.")}$`, "i"), "")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const gameFromScannedFile = (file: ScannedFile, existing?: Game): Game => {
  const now = new Date().toISOString();

  return {
    id: existing?.id ?? stableGameId(file.path),
    title: existing?.title ?? titleFromFile(file),
    platform: file.platform,
    filePath: file.path,
    fileName: file.fileName,
    fileExtension: file.extension,
    coverUrl: existing?.coverUrl,
    coverLocalPath: existing?.coverLocalPath,
    description:
      existing?.description ??
      "Jogo de PS2 importado da sua biblioteca local. Metadados e capas reais serão adicionados em uma etapa futura.",
    releaseYear: existing?.releaseYear,
    genre: existing?.genre ?? "Biblioteca local",
    region: existing?.region,
    serial: existing?.serial,
    developer: existing?.developer,
    publisher: existing?.publisher,
    releasedAt: existing?.releasedAt,
    rating: existing?.rating,
    metacritic: existing?.metacritic,
    metadataSource: existing?.metadataSource,
    metadataExternalId: existing?.metadataExternalId,
    metadataStatus: existing?.metadataStatus,
    metadataLastAttemptAt: existing?.metadataLastAttemptAt,
    metadataUpdatedAt: existing?.metadataUpdatedAt,
    metadataError: existing?.metadataError,
    rawgUrl: existing?.rawgUrl,
    metadata: existing?.metadata,
    lastPlayedAt: existing?.lastPlayedAt,
    playtimeSeconds: existing?.playtimeSeconds ?? 0,
    isFavorite: existing?.isFavorite ?? false,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
};

export const gamesService = {
  async list(query: GameQuery = {}): Promise<Game[]> {
    const normalizedSearch = normalizeForSearch(query.search?.trim() ?? "");
    const games = await databaseService.listGames();

    return games
      .filter((game) => {
        const matchesSearch =
          !normalizedSearch ||
          normalizeForSearch(game.title).includes(normalizedSearch) ||
          (game.genre ? normalizeForSearch(game.genre).includes(normalizedSearch) : false) ||
          normalizeForSearch(game.fileName).includes(normalizedSearch);
        const matchesPlatform =
          !query.platform || query.platform === "ALL" || game.platform === query.platform;
        const matchesFavorite = !query.favoritesOnly || game.isFavorite;

        return matchesSearch && matchesPlatform && matchesFavorite;
      })
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  },

  async getById(id: string): Promise<Game | undefined> {
    return databaseService.getGame(id);
  },

  async recordFinishedSession(gameId: string, durationSeconds: number): Promise<Game | undefined> {
    const games = await databaseService.listGames();
    const now = new Date().toISOString();
    const nextGames = games.map((game) =>
      game.id === gameId
        ? {
            ...game,
            lastPlayedAt: now,
            playtimeSeconds: game.playtimeSeconds + durationSeconds,
            updatedAt: now,
          }
        : game,
    );

    const updatedGame = nextGames.find((game) => game.id === gameId);
    if (updatedGame) {
      await databaseService.upsertGame(updatedGame);
    }
    return updatedGame;
  },

  async enrichMetadata(gameId: string): Promise<Game | undefined> {
    const games = await databaseService.listGames();
    const game = games.find((candidate) => candidate.id === gameId);
    if (!game) return undefined;

    const attemptedAt = new Date().toISOString();
    await databaseService.upsertGame({
      ...game,
      metadataStatus: "pending",
      metadataLastAttemptAt: attemptedAt,
    });

    try {
      const bundle = await metadataService.fetch({
        title:
          normalizeGameTitle(
            game.fileName.replace(
              new RegExp(`${game.fileExtension.replace(".", "\\.")}$`, "i"),
              "",
            ),
          ) || game.title,
        platform: game.platform,
        releaseYear: game.releaseYear,
        serial: game.serial,
        region: game.region,
      });
      const metadata = composeMetadata(bundle, game.metadata, game.coverUrl);
      const updatedAt = new Date().toISOString();
      const nextGame: Game = metadata
        ? {
            ...game,
            title: metadata.title || game.title,
            coverUrl: metadata.cover?.imageUrl ?? game.coverUrl,
            description: metadata.description ?? game.description,
            releasedAt: metadata.releaseDate,
            releaseYear: metadata.releaseYear ?? game.releaseYear,
            genre: metadata.genres.join(" · ") || game.genre,
            developer: metadata.developers.join(", ") || game.developer,
            publisher: metadata.publishers.join(", ") || game.publisher,
            rating: metadata.rating,
            metacritic: metadata.metacritic,
            metadataSource:
              metadata.igdbId && metadata.rawgId ? "COMPOSED" : metadata.igdbId ? "IGDB" : "RAWG",
            metadataExternalId: String(metadata.igdbId ?? metadata.rawgId ?? ""),
            metadataStatus: "matched",
            metadataLastAttemptAt: attemptedAt,
            metadataUpdatedAt: updatedAt,
            metadataError: undefined,
            rawgUrl: metadata.rawgUrl,
            metadata,
            updatedAt,
          }
        : {
            ...game,
            metadataStatus: "not_found",
            metadataLastAttemptAt: attemptedAt,
            metadataError: undefined,
          };

      await databaseService.upsertGame(nextGame);
      return nextGame;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const nextGame: Game = {
        ...game,
        metadataStatus: "error",
        metadataLastAttemptAt: attemptedAt,
        metadataError: message,
      };
      await databaseService.upsertGame(nextGame);
      throw new Error(message);
    }
  },

  async enrichMissingMetadata(limit = 8): Promise<number> {
    const configuration = await metadataService.configuration();
    if (!configuration.rawg && !configuration.igdb) return 0;

    const retryThreshold = Date.now() - 24 * 60 * 60 * 1000;
    const candidates = (await databaseService.listGames())
      .filter((game) => {
        const needsMigration = !game.metadata || (game.metadata.schemaVersion ?? 0) < 3;
        const needsRawg = configuration.rawg && !game.metadata?.rawgId;
        const needsIgdb = configuration.igdb && !game.metadata?.igdbId;
        if (needsMigration) return true;
        const canRetryProvider =
          !game.metadataLastAttemptAt ||
          new Date(game.metadataLastAttemptAt).getTime() < retryThreshold;
        if (needsRawg || needsIgdb) return canRetryProvider;
        if (game.metadataStatus === "matched" && game.metadata?.metadataUpdatedAt) {
          return new Date(game.metadata.metadataUpdatedAt).getTime() < retryThreshold;
        }
        if (!game.metadataLastAttemptAt) return true;
        return new Date(game.metadataLastAttemptAt).getTime() < retryThreshold;
      })
      .slice(0, limit);

    let processed = 0;
    for (const game of candidates) {
      try {
        await this.enrichMetadata(game.id);
      } catch {
        // Per-game failures are persisted and retried after the cooldown.
      }
      processed += 1;
      await wait(350);
    }
    return processed;
  },

  async importScanResult(
    result: ScanResult,
    options: ImportScanOptions = {},
  ): Promise<LibrarySyncResult> {
    await wait(120);
    const existingGames = await databaseService.listGames();
    const existingByPath = new Map(
      existingGames.map((game) => [game.filePath.toLocaleLowerCase("pt-BR"), game]),
    );
    const importedGames = result.files.map((file) =>
      gameFromScannedFile(file, existingByPath.get(file.path.toLocaleLowerCase("pt-BR"))),
    );
    const importedPaths = new Set(
      importedGames.map((game) => game.filePath.toLocaleLowerCase("pt-BR")),
    );
    const removedGames: Game[] = [];
    const manuallyKeptGames = existingGames.filter((game) => {
      const isImported = importedPaths.has(game.filePath.toLocaleLowerCase("pt-BR"));
      const isPruneCandidate =
        options.pruneMissingFromSource &&
        game.platform === result.request.platform &&
        isInsideFolder(game.filePath, result.request.folderPath);

      if (!isImported && isPruneCandidate) {
        removedGames.push(game);
      }

      return !isImported && !isPruneCandidate;
    });
    const nextGames = [...importedGames, ...manuallyKeptGames];
    const importedExistingCount = importedGames.filter((game) =>
      existingByPath.has(game.filePath.toLocaleLowerCase("pt-BR")),
    ).length;
    const stats: LibrarySyncStats = {
      added: importedGames.length - importedExistingCount,
      updated: importedExistingCount,
      removed: removedGames.length,
      total: nextGames.length,
    };
    const state: LibraryState = {
      totalGames: nextGames.length,
      lastSyncedAt: new Date().toISOString(),
      lastScannedFolderPath: result.request.folderPath,
      lastScannedPlatform: result.request.platform,
      lastScanDurationMilliseconds: result.durationMilliseconds,
      lastIgnoredCount: result.ignoredCount,
      lastSyncStats: stats,
    };

    await databaseService.replaceGames(nextGames);
    await databaseService.setLibraryState(state);

    return { scanResult: result, games: nextGames, state, stats };
  },

  async syncConfiguredLibrary(platform: Platform = "PS2"): Promise<LibrarySyncResult | undefined> {
    const settings = await settingsService.get();
    const libraryFolder = settings.libraryFolders[platform];

    if (!libraryFolder?.autoScan || !libraryFolder.folderPath.trim()) {
      return undefined;
    }

    const scanResult = await scannerService.preview({
      folderPath: libraryFolder.folderPath,
      platform,
      recursive: libraryFolder.recursiveScan,
    });
    return this.importScanResult(scanResult, { pruneMissingFromSource: true });
  },

  async getLibraryState(): Promise<LibraryState> {
    const [state, games] = await Promise.all([
      databaseService.getLibraryState(),
      databaseService.listGames(),
    ]);
    return state ?? { totalGames: games.length };
  },

  async clear(): Promise<void> {
    await databaseService.clearLibrary();
  },
};
