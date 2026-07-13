import type { AppSettings } from "@/features/settings/settings.types";
import { readMigratedStorage } from "@/lib/storage-migration";

const settingsStorageKey = "arcadium.settings.v1";
const legacySettingsStorageKeys = ["ludex.settings.v1"];
const legacyLaunchProfileStorageKeys = ["arcadium.launchProfiles.v1", "ludex.launchProfiles.v1"];

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
  execution: {
    fullscreen: true,
    customArgs: "",
    resolutionPreset: "native",
    controllerProfile: "default",
  },
};

const readLegacyExecutionSettings = (): AppSettings["execution"] | undefined => {
  for (const storageKey of legacyLaunchProfileStorageKeys) {
    const rawValue = window.localStorage.getItem(storageKey);
    if (!rawValue) continue;
    try {
      const profiles = JSON.parse(rawValue) as Array<
        Partial<AppSettings["execution"]> & {
          updatedAt?: string;
        }
      >;
      if (!Array.isArray(profiles) || profiles.length === 0) continue;
      const latestProfile = [...profiles].sort((left, right) =>
        (right.updatedAt ?? "").localeCompare(left.updatedAt ?? ""),
      )[0];
      return {
        fullscreen: latestProfile.fullscreen ?? defaultSettings.execution.fullscreen,
        customArgs: latestProfile.customArgs ?? defaultSettings.execution.customArgs,
        resolutionPreset:
          latestProfile.resolutionPreset ?? defaultSettings.execution.resolutionPreset,
        controllerProfile:
          latestProfile.controllerProfile ?? defaultSettings.execution.controllerProfile,
      };
    } catch {
      // Ignore invalid legacy state and keep safe defaults.
    }
  }
  return undefined;
};

const readSettings = (): AppSettings => {
  const rawValue = readMigratedStorage(settingsStorageKey, legacySettingsStorageKeys);
  if (!rawValue) {
    const settings = structuredClone(defaultSettings);
    settings.execution = readLegacyExecutionSettings() ?? settings.execution;
    return settings;
  }

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
      execution: {
        ...defaultSettings.execution,
        ...(parsedValue.execution ?? readLegacyExecutionSettings()),
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
      execution: {
        ...currentSettings.execution,
        ...patch.execution,
      },
    };

    writeSettings(nextSettings);

    return nextSettings;
  },
};
