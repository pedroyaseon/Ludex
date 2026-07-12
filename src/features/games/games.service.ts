import type { ScanResult, ScannedFile } from "@/features/library-scanner/scanner.types";
import { scannerService } from "@/features/library-scanner/scanner.service";
import { metadataService } from "@/features/metadata/metadata.service";
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

const libraryStorageKey = "ludex.library.games.v1";
const libraryStateStorageKey = "ludex.library.state.v1";

const wait = (milliseconds = 180) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

const normalizeForSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR");

const readStoredGames = (): Game[] => {
  const rawValue = window.localStorage.getItem(libraryStorageKey);
  if (!rawValue) return [];

  try {
    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? (parsedValue as Game[]) : [];
  } catch {
    return [];
  }
};

const writeStoredGames = (games: Game[]) => {
  window.localStorage.setItem(libraryStorageKey, JSON.stringify(games));
};

const readLibraryState = (): LibraryState => {
  const rawValue = window.localStorage.getItem(libraryStateStorageKey);
  if (!rawValue) return { totalGames: readStoredGames().length };

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<LibraryState>;
    return {
      totalGames: parsedValue.totalGames ?? readStoredGames().length,
      lastSyncedAt: parsedValue.lastSyncedAt,
      lastScannedFolderPath: parsedValue.lastScannedFolderPath,
      lastScannedPlatform: parsedValue.lastScannedPlatform,
      lastScanDurationMilliseconds: parsedValue.lastScanDurationMilliseconds,
      lastIgnoredCount: parsedValue.lastIgnoredCount,
      lastSyncStats: parsedValue.lastSyncStats,
    };
  } catch {
    return { totalGames: readStoredGames().length };
  }
};

const writeLibraryState = (state: LibraryState) => {
  window.localStorage.setItem(libraryStateStorageKey, JSON.stringify(state));
};

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
    lastPlayedAt: existing?.lastPlayedAt,
    playtimeSeconds: existing?.playtimeSeconds ?? 0,
    isFavorite: existing?.isFavorite ?? false,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
};

export const gamesService = {
  async list(query: GameQuery = {}): Promise<Game[]> {
    await wait();
    const normalizedSearch = normalizeForSearch(query.search?.trim() ?? "");
    const games = readStoredGames();

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
    await wait(100);
    return readStoredGames().find((game) => game.id === id);
  },

  async recordFinishedSession(gameId: string, durationSeconds: number): Promise<Game | undefined> {
    await wait(80);
    const games = readStoredGames();
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

    writeStoredGames(nextGames);

    return nextGames.find((game) => game.id === gameId);
  },

  async enrichMetadata(gameId: string): Promise<Game | undefined> {
    const games = readStoredGames();
    const game = games.find((candidate) => candidate.id === gameId);
    if (!game) return undefined;

    const attemptedAt = new Date().toISOString();
    writeStoredGames(
      games.map((candidate) =>
        candidate.id === gameId
          ? { ...candidate, metadataStatus: "pending", metadataLastAttemptAt: attemptedAt }
          : candidate,
      ),
    );

    try {
      const metadata = await metadataService.fetch(game.title, game.platform);
      const updatedAt = new Date().toISOString();
      const nextGame: Game = metadata
        ? {
            ...game,
            title: metadata.title || game.title,
            coverUrl: metadata.coverUrl ?? game.coverUrl,
            description: metadata.description ?? game.description,
            releasedAt: metadata.releasedAt,
            releaseYear: metadata.releasedAt
              ? Number.parseInt(metadata.releasedAt.slice(0, 4), 10)
              : game.releaseYear,
            genre: metadata.genres.join(" · ") || game.genre,
            developer: metadata.developers.join(", ") || game.developer,
            publisher: metadata.publishers.join(", ") || game.publisher,
            rating: metadata.rating,
            metacritic: metadata.metacritic,
            metadataSource: "RAWG",
            metadataExternalId: String(metadata.rawgId),
            metadataStatus: "matched",
            metadataLastAttemptAt: attemptedAt,
            metadataUpdatedAt: updatedAt,
            metadataError: undefined,
            rawgUrl: metadata.rawgUrl,
            updatedAt,
          }
        : {
            ...game,
            metadataStatus: "not_found",
            metadataLastAttemptAt: attemptedAt,
            metadataError: undefined,
          };

      writeStoredGames(
        readStoredGames().map((candidate) => (candidate.id === gameId ? nextGame : candidate)),
      );
      return nextGame;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const nextGame: Game = {
        ...game,
        metadataStatus: "error",
        metadataLastAttemptAt: attemptedAt,
        metadataError: message,
      };
      writeStoredGames(
        readStoredGames().map((candidate) => (candidate.id === gameId ? nextGame : candidate)),
      );
      throw new Error(message);
    }
  },

  async enrichMissingMetadata(limit = 8): Promise<number> {
    if (!(await metadataService.isConfigured())) return 0;

    const retryThreshold = Date.now() - 24 * 60 * 60 * 1000;
    const candidates = readStoredGames()
      .filter((game) => {
        if (game.metadataStatus === "matched") return false;
        if (!game.metadataLastAttemptAt) return true;
        return new Date(game.metadataLastAttemptAt).getTime() < retryThreshold;
      })
      .slice(0, limit);

    let enriched = 0;
    for (const game of candidates) {
      try {
        const result = await this.enrichMetadata(game.id);
        if (result?.metadataStatus === "matched") enriched += 1;
      } catch {
        // Per-game failures are persisted and retried after the cooldown.
      }
    }
    return enriched;
  },

  async importScanResult(
    result: ScanResult,
    options: ImportScanOptions = {},
  ): Promise<LibrarySyncResult> {
    await wait(120);
    const existingGames = readStoredGames();
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

    writeStoredGames(nextGames);
    writeLibraryState(state);

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
    await wait(60);
    return readLibraryState();
  },

  async clear(): Promise<void> {
    await wait(80);
    window.localStorage.removeItem(libraryStorageKey);
    window.localStorage.removeItem(libraryStateStorageKey);
  },
};
