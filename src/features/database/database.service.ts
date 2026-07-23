import { invoke } from "@tauri-apps/api/core";
import type { Game, PlaySession } from "@/types/domain";
import type { ActivePlaySession } from "@/features/games/play-sessions.service";
import type { LibraryState } from "@/features/games/games.service";

export interface DatabaseInfo {
  schemaVersion: number;
  journalMode: string;
  gameCount: number;
  sessionCount: number;
  sizeBytes: number;
  integrityStatus: string;
}

export interface LegacyMigrationReport {
  importedGames: number;
  importedSessions: number;
  skipped: boolean;
}

const legacyKeys = {
  games: ["arcadium.library.games.v1", "ludex.library.games.v1"],
  libraryState: ["arcadium.library.state.v1", "ludex.library.state.v1"],
  sessions: ["arcadium.playSessions.v1", "ludex.playSessions.v1"],
  activeSessions: ["arcadium.playSessions.active.v1", "ludex.playSessions.active.v1"],
};

const readFirstJson = <T>(keys: string[], fallback: T): T => {
  for (const key of keys) {
    const value = window.localStorage.getItem(key);
    if (!value) continue;
    try {
      return JSON.parse(value) as T;
    } catch {
      // Continue looking for a valid legacy copy.
    }
  }
  return fallback;
};

const removeLegacyLibraryData = () => {
  Object.values(legacyKeys)
    .flat()
    .forEach((key) => window.localStorage.removeItem(key));
};

export const databaseService = {
  async listGames(): Promise<Game[]> {
    return invoke<Game[]>("database_list_games");
  },

  async getGame(id: string): Promise<Game | undefined> {
    return (await invoke<Game | null>("database_get_game", { id })) ?? undefined;
  },

  async replaceGames(games: Game[]): Promise<void> {
    await invoke("database_replace_games", { games });
  },

  async upsertGame(game: Game): Promise<void> {
    await invoke("database_upsert_game", { game });
  },

  async listSessions(active: boolean): Promise<ActivePlaySession[]> {
    return invoke<ActivePlaySession[]>("database_list_sessions", { active });
  },

  async replaceSessions(
    sessions: Array<PlaySession | ActivePlaySession>,
    active: boolean,
  ): Promise<void> {
    await invoke("database_replace_sessions", { sessions, active });
  },

  async getLibraryState(): Promise<LibraryState | undefined> {
    return (await invoke<LibraryState | null>("database_get_library_state")) ?? undefined;
  },

  async setLibraryState(value: LibraryState): Promise<void> {
    await invoke("database_set_library_state", { value });
  },

  async clearLibrary(): Promise<void> {
    await invoke("database_clear_library");
  },

  async info(): Promise<DatabaseInfo> {
    return invoke<DatabaseInfo>("database_info");
  },

  async optimize(): Promise<DatabaseInfo> {
    return invoke<DatabaseInfo>("database_optimize");
  },

  async migrateLegacyStorage(): Promise<LegacyMigrationReport> {
    const games = readFirstJson<Game[]>(legacyKeys.games, []);
    const knownGameIds = new Set(games.map((game) => game.id));
    const libraryState = readFirstJson<LibraryState | undefined>(
      legacyKeys.libraryState,
      undefined,
    );
    const sessions = readFirstJson<PlaySession[]>(legacyKeys.sessions, []).filter((session) =>
      knownGameIds.has(session.gameId),
    );
    const activeSessions = readFirstJson<ActivePlaySession[]>(legacyKeys.activeSessions, []).filter(
      (session) => knownGameIds.has(session.gameId),
    );

    const report = await invoke<LegacyMigrationReport>("database_migrate_legacy", {
      games,
      libraryState,
      sessions,
      activeSessions,
    });
    removeLegacyLibraryData();
    return report;
  },
};
