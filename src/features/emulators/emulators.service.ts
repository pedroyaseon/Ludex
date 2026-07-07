import { Pcsx2Adapter } from "@/features/emulators/pcsx2.adapter";
import { Rpcs3Adapter } from "@/features/emulators/rpcs3.adapter";
import type { Emulator, Platform } from "@/types/domain";

const now = "2026-06-01T12:00:00.000Z";

const emulators: Emulator[] = [
  {
    id: "pcsx2-default",
    name: "PCSX2",
    platform: "PS2",
    executablePath: "F:\\PCSX2",
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
    return structuredClone(emulators);
  },

  async getDefault(platform: Platform): Promise<Emulator | undefined> {
    return emulators.find((emulator) => emulator.platform === platform && emulator.isDefault);
  },

  getAdapter(platform: Platform) {
    return adapters[platform];
  },
};
