import { Pcsx2Adapter } from "@/features/emulators/pcsx2.adapter";
import { Rpcs3Adapter } from "@/features/emulators/rpcs3.adapter";
import { settingsService } from "@/features/settings/settings.service";
import type { Emulator, Platform } from "@/types/domain";

const now = "2026-06-01T12:00:00.000Z";

const emulators: Emulator[] = [
  {
    id: "pcsx2-default",
    name: "PCSX2",
    platform: "PS2",
    defaultArgs: "--nogui",
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "rpcs3-future",
    name: "RPCS3",
    platform: "PS3",
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  },
];

const adapters = {
  PS2: new Pcsx2Adapter(),
  PS3: new Rpcs3Adapter(),
};

export const emulatorsService = {
  async list(): Promise<Emulator[]> {
    const settings = await settingsService.get();
    return emulators.map((emulator) => ({
      ...structuredClone(emulator),
      executablePath: settings.emulatorPaths[emulator.platform],
    }));
  },

  async getDefault(platform: Platform): Promise<Emulator | undefined> {
    const settings = await settingsService.get();
    const emulator = emulators.find(
      (candidate) => candidate.platform === platform && candidate.isDefault,
    );

    return emulator
      ? {
          ...structuredClone(emulator),
          executablePath: settings.emulatorPaths[platform],
        }
      : undefined;
  },

  getAdapter(platform: Platform) {
    return adapters[platform];
  },
};
