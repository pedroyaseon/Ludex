import type { Game, LaunchProfile } from "@/types/domain";

export interface LaunchProfileDraft {
  fullscreen: boolean;
  customArgs: string;
  resolutionPreset: string;
  controllerProfile: string;
}

const launchProfilesStorageKey = "ludex.launchProfiles.v1";

const readProfiles = (): LaunchProfile[] => {
  const rawValue = window.localStorage.getItem(launchProfilesStorageKey);
  if (!rawValue) return [];

  try {
    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? (parsedValue as LaunchProfile[]) : [];
  } catch {
    return [];
  }
};

const writeProfiles = (profiles: LaunchProfile[]) => {
  window.localStorage.setItem(launchProfilesStorageKey, JSON.stringify(profiles));
};

const nowIso = () => new Date().toISOString();

export const launchProfilesService = {
  async getForGame(game: Game): Promise<LaunchProfile> {
    const existingProfile = readProfiles().find((profile) => profile.gameId === game.id);
    if (existingProfile) return existingProfile;

    const now = nowIso();
    return {
      id: `profile-${game.id}`,
      gameId: game.id,
      emulatorId: game.platform === "PS2" ? "pcsx2" : "rpcs3",
      fullscreen: true,
      customArgs: "",
      resolutionPreset: "native",
      controllerProfile: "default",
      createdAt: now,
      updatedAt: now,
    };
  },

  async saveForGame(game: Game, draft: LaunchProfileDraft): Promise<LaunchProfile> {
    const profiles = readProfiles();
    const existingProfile = profiles.find((profile) => profile.gameId === game.id);
    const now = nowIso();
    const nextProfile: LaunchProfile = {
      id: existingProfile?.id ?? `profile-${game.id}`,
      gameId: game.id,
      emulatorId: existingProfile?.emulatorId ?? (game.platform === "PS2" ? "pcsx2" : "rpcs3"),
      fullscreen: draft.fullscreen,
      customArgs: draft.customArgs.trim(),
      resolutionPreset: draft.resolutionPreset.trim() || "native",
      controllerProfile: draft.controllerProfile.trim() || "default",
      createdAt: existingProfile?.createdAt ?? now,
      updatedAt: now,
    };
    const nextProfiles = [nextProfile, ...profiles.filter((profile) => profile.gameId !== game.id)];

    writeProfiles(nextProfiles);

    return nextProfile;
  },
};
