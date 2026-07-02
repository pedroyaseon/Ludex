import { invoke } from "@tauri-apps/api/core";
import type { AppSettings } from "@/features/settings/settings.types";

const defaultSettings: AppSettings = {
  theme: "dark",
  language: "pt-BR",
  minimizeToTray: false,
  checkForUpdates: true,
  emulatorPaths: {},
};

let browserSettings = structuredClone(defaultSettings);

export function usesDesktopPersistence() {
  return "__TAURI_INTERNALS__" in window;
}

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

    return structuredClone(browserSettings);
  },

  async update(patch: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.get();
    const settings = mergeSettings(current, patch);

    if (usesDesktopPersistence()) {
      return invoke<AppSettings>("save_settings", { settings });
    }

    browserSettings = settings;
    return structuredClone(browserSettings);
  },
};
