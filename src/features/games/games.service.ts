import { mockGames } from "@/features/games/games.mock";
import type { Game, Platform } from "@/types/domain";

export interface GameQuery {
  search?: string;
  platform?: Platform | "ALL";
  favoritesOnly?: boolean;
}

const wait = (milliseconds = 180) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

const normalizeForSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR");

export const gamesService = {
  async list(query: GameQuery = {}): Promise<Game[]> {
    await wait();
    const normalizedSearch = normalizeForSearch(query.search?.trim() ?? "");

    return mockGames.filter((game) => {
      const matchesSearch =
        !normalizedSearch ||
        normalizeForSearch(game.title).includes(normalizedSearch) ||
        (game.genre ? normalizeForSearch(game.genre).includes(normalizedSearch) : false);
      const matchesPlatform =
        !query.platform || query.platform === "ALL" || game.platform === query.platform;
      const matchesFavorite = !query.favoritesOnly || game.isFavorite;

      return matchesSearch && matchesPlatform && matchesFavorite;
    });
  },

  async getById(id: string): Promise<Game | undefined> {
    await wait(100);
    return mockGames.find((game) => game.id === id);
  },
};
