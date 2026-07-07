import type { AppSettings } from "@/features/settings/settings.types";

const settingsStorageKey = "ludex.settings.v1";

const defaultSettings: AppSettings = {
  theme: "dark",
  language: "pt-BR",
  minimizeToTray: false,
  checkForUpdates: true,
  emulatorPaths: {
    PS2: "F:\\PCSX2",
  },
};

const readSettings = (): AppSettings => {
  const rawValue = window.localStorage.getItem(settingsStorageKey);
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
    };
  } catch {
    return structuredClone(defaultSettings);
  }
};

const writeSettings = (settings: AppSettings) => {
  window.localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
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
    };

    writeSettings(nextSettings);

    return nextSettings;
  },
};
