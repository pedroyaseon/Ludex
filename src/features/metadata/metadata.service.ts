import { invoke } from "@tauri-apps/api/core";
import type { Platform } from "@/types/domain";

export interface GameMetadata {
  rawgId: number;
  title: string;
  description?: string;
  releasedAt?: string;
  coverUrl?: string;
  genres: string[];
  developers: string[];
  publishers: string[];
  rating?: number;
  metacritic?: number;
  rawgUrl: string;
}

export const metadataService = {
  isConfigured(): Promise<boolean> {
    return invoke<boolean>("is_rawg_configured");
  },

  fetch(title: string, platform: Platform): Promise<GameMetadata | null> {
    return invoke<GameMetadata | null>("fetch_game_metadata", { title, platform });
  },
};
