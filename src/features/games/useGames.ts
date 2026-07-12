import { useCallback, useEffect, useRef, useState } from "react";
import {
  gamesService,
  type GameQuery,
  type LibraryState,
  type LibrarySyncResult,
} from "@/features/games/games.service";
import type { Game } from "@/types/domain";

export function useGames(query: GameQuery = {}) {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string>();
  const [lastSyncResult, setLastSyncResult] = useState<LibrarySyncResult>();
  const [libraryState, setLibraryState] = useState<LibraryState>({ totalGames: 0 });
  const hasAutoSynced = useRef(false);
  const { search, platform, favoritesOnly } = query;

  const loadGames = useCallback(async () => {
    const [result, state] = await Promise.all([
      gamesService.list({ search, platform, favoritesOnly }),
      gamesService.getLibraryState(),
    ]);
    setGames(result);
    setLibraryState(state);
  }, [favoritesOnly, platform, search]);

  useEffect(() => {
    setIsLoading(true);
    void loadGames().finally(() => setIsLoading(false));
  }, [loadGames]);

  const syncLibrary = useCallback(async () => {
    setIsSyncing(true);
    setSyncError(undefined);

    try {
      const syncResult = await gamesService.syncConfiguredLibrary("PS2");
      setLastSyncResult(syncResult);
      if (syncResult?.state) setLibraryState(syncResult.state);
      await loadGames();
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSyncing(false);
    }
  }, [loadGames]);

  useEffect(() => {
    if (hasAutoSynced.current) return;
    hasAutoSynced.current = true;
    void syncLibrary();
  }, [syncLibrary]);

  const clearLibrary = useCallback(async () => {
    await gamesService.clear();
    setLastSyncResult(undefined);
    setLibraryState({ totalGames: 0 });
    await loadGames();
  }, [loadGames]);

  return {
    games,
    isLoading,
    isSyncing,
    syncError,
    lastSyncResult,
    libraryState,
    refresh: syncLibrary,
    clearLibrary,
  };
}
