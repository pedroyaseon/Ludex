import type { ScanResult, ScannedFile } from "@/features/library-scanner/scanner.types";
import type { Game, Platform } from "@/types/domain";

export interface GameQuery {
  search?: string;
  platform?: Platform | "ALL";
  favoritesOnly?: boolean;
}

const libraryStorageKey = "ludex.library.games.v1";

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

  async importScanResult(result: ScanResult): Promise<Game[]> {
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
    const manuallyKeptGames = existingGames.filter(
      (game) => !importedPaths.has(game.filePath.toLocaleLowerCase("pt-BR")),
    );
    const nextGames = [...importedGames, ...manuallyKeptGames];

    writeStoredGames(nextGames);

    return nextGames;
  },

  async clear(): Promise<void> {
    await wait(80);
    window.localStorage.removeItem(libraryStorageKey);
  },
};
