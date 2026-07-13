import { useCallback, useEffect, useState } from "react";
import { gamesService, type GameQuery, type LibraryState } from "@/features/games/games.service";
import type { Game } from "@/types/domain";
import {
  libraryMonitorStatusEvent,
  libraryMonitorService,
  libraryUpdatedEvent,
  type LibraryMonitorStatus,
} from "@/features/library-scanner/library-monitor.service";

export function useGames(query: GameQuery = {}) {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [monitorStatus, setMonitorStatus] = useState<LibraryMonitorStatus>(() =>
    libraryMonitorService.getStatus(),
  );
  const [libraryState, setLibraryState] = useState<LibraryState>({ totalGames: 0 });
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

  useEffect(() => {
    const handleLibraryUpdated = () => {
      setIsRefreshing(true);
      void loadGames().finally(() => setIsRefreshing(false));
    };
    const handleMonitorStatus = (event: Event) => {
      setMonitorStatus((event as CustomEvent<LibraryMonitorStatus>).detail);
    };
    window.addEventListener(libraryUpdatedEvent, handleLibraryUpdated);
    window.addEventListener(libraryMonitorStatusEvent, handleMonitorStatus);
    return () => {
      window.removeEventListener(libraryUpdatedEvent, handleLibraryUpdated);
      window.removeEventListener(libraryMonitorStatusEvent, handleMonitorStatus);
    };
  }, [loadGames]);

  const clearLibrary = useCallback(async () => {
    await gamesService.clear();
    setLibraryState({ totalGames: 0 });
    await loadGames();
  }, [loadGames]);

  return {
    games,
    isLoading,
    isSynchronizing: monitorStatus === "starting" || monitorStatus === "syncing" || isRefreshing,
    monitorStatus,
    libraryState,
    clearLibrary,
  };
}
