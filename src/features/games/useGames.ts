import { useCallback, useEffect, useRef, useState } from "react";
import {
  gamesService,
  type GameQuery,
  type LibrarySyncResult,
} from "@/features/games/games.service";
import type { Game } from "@/types/domain";

export function useGames(query: GameQuery = {}) {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string>();
  const [lastSyncResult, setLastSyncResult] = useState<LibrarySyncResult>();
  const hasAutoSynced = useRef(false);
  const { search, platform, favoritesOnly } = query;

  const loadGames = useCallback(async () => {
    const result = await gamesService.list({ search, platform, favoritesOnly });
    setGames(result);
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

  return { games, isLoading, isSyncing, syncError, lastSyncResult, refresh: syncLibrary };
}
