import { settingsService } from "@/features/settings/settings.service";
import type { Game, LaunchProfile } from "@/types/domain";

export const launchProfilesService = {
  async getForGame(game: Game): Promise<LaunchProfile> {
    const settings = await settingsService.get();
    const now = new Date().toISOString();
    return {
      id: `profile-${game.platform.toLowerCase()}-default`,
      gameId: game.id,
      emulatorId: game.platform === "PS2" ? "pcsx2" : "rpcs3",
      fullscreen: settings.execution.fullscreen,
      customArgs: settings.execution.customArgs.trim(),
      resolutionPreset: settings.execution.resolutionPreset.trim() || "native",
      controllerProfile: settings.execution.controllerProfile.trim() || "default",
      createdAt: now,
      updatedAt: now,
    };
  },
};
