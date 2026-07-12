import { invoke } from "@tauri-apps/api/core";
import type { LaunchProfile } from "@/types/domain";
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
  profile?: LaunchProfile;
}

const parseCustomArgs = (customArgs?: string): string[] => {
  if (!customArgs?.trim()) return [];

  const args = customArgs.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
  return args.map((arg) => arg.replace(/^"|"$/g, "").trim()).filter(Boolean);
};

export const launcherService = {
  async launchGame(request: LaunchGameRequest): Promise<LaunchGameResult> {
    return invoke<LaunchGameResult>("launch_game", {
      emulatorPath: request.emulatorPath,
      gamePath: request.game.filePath,
      platform: request.platform ?? request.game.platform,
      fullscreen: request.profile?.fullscreen ?? false,
      args: parseCustomArgs(request.profile?.customArgs),
    });
  },
};
