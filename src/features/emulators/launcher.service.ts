import { invoke } from "@tauri-apps/api/core";
import type { Game, Platform } from "@/types/domain";

export interface LaunchGameResult {
  emulatorPath: string;
  gamePath: string;
  processId: number;
}

export interface LaunchGameRequest {
  emulatorPath: string;
  game: Game;
  platform?: Platform;
}

export const launcherService = {
  async launchGame(request: LaunchGameRequest): Promise<LaunchGameResult> {
    return invoke<LaunchGameResult>("launch_game", {
      emulatorPath: request.emulatorPath,
      gamePath: request.game.filePath,
      platform: request.platform ?? request.game.platform,
    });
  },
};
