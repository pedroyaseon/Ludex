import type { AppSettings } from "@/features/settings/settings.types";
import { readMigratedStorage } from "@/lib/storage-migration";

const settingsStorageKey = "arcadium.settings.v1";
const legacySettingsStorageKeys = ["ludex.settings.v1"];

const defaultSettings: AppSettings = {
  theme: "dark",
  language: "pt-BR",
  minimizeToTray: false,
  checkForUpdates: true,
  emulatorPaths: {
    PS2: "F:\\PCSX2",
  },
  libraryFolders: {
    PS2: {
      folderPath: "F:\\ISOs PS2",
      recursiveScan: true,
      autoScan: true,
    },
  },
};

const readSettings = (): AppSettings => {
  const rawValue = readMigratedStorage(settingsStorageKey, legacySettingsStorageKeys);
  if (!rawValue) return structuredClone(defaultSettings);

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<AppSettings>;
    return {
      ...defaultSettings,
      ...parsedValue,
      emulatorPaths: {
        ...defaultSettings.emulatorPaths,
        ...parsedValue.emulatorPaths,
      },
      libraryFolders: {
        ...defaultSettings.libraryFolders,
        ...parsedValue.libraryFolders,
      },
    };
  } catch {
    return structuredClone(defaultSettings);
  }
};

const writeSettings = (settings: AppSettings) => {
  window.localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
  window.dispatchEvent(new Event("arcadium:settings-updated"));
};

export const settingsService = {
  async get(): Promise<AppSettings> {
    return readSettings();
  },

  async update(patch: Partial<AppSettings>): Promise<AppSettings> {
    const currentSettings = readSettings();
    const nextSettings = {
      ...currentSettings,
      ...patch,
      emulatorPaths: {
        ...currentSettings.emulatorPaths,
        ...patch.emulatorPaths,
      },
      libraryFolders: {
        ...currentSettings.libraryFolders,
        ...patch.libraryFolders,
      },
    };

    writeSettings(nextSettings);

    return nextSettings;
  },
};
