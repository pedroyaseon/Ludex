import { invoke } from "@tauri-apps/api/core";
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

export function usesDesktopPersistence() {
  return "__TAURI_INTERNALS__" in window;
}

const readBrowserSettings = (): AppSettings => {
  const rawValue = window.localStorage.getItem(settingsStorageKey);
  if (!rawValue) return structuredClone(defaultSettings);

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<AppSettings>;
    return mergeSettings(defaultSettings, parsedValue);
  } catch {
    return structuredClone(defaultSettings);
  }
};

const writeBrowserSettings = (settings: AppSettings) => {
  window.localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
};

function mergeSettings(current: AppSettings, patch: Partial<AppSettings>): AppSettings {
  return {
    ...current,
    ...patch,
    emulatorPaths: {
      ...current.emulatorPaths,
      ...patch.emulatorPaths,
    },
  };
}

export const settingsService = {
  async get(): Promise<AppSettings> {
    if (usesDesktopPersistence()) {
      return invoke<AppSettings>("get_settings");
    }

    return readBrowserSettings();
  },

  async update(patch: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.get();
    const settings = mergeSettings(current, patch);

    if (usesDesktopPersistence()) {
      return invoke<AppSettings>("save_settings", { settings });
    }

    writeBrowserSettings(settings);
    return settings;
  },
};
