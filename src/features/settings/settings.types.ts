import type { Platform } from "@/types/domain";

export type ThemePreference = "dark" | "light" | "system";

export interface LibraryFolderSettings {
  folderPath: string;
  recursiveScan: boolean;
  autoScan: boolean;
}

export interface ExecutionSettings {
  fullscreen: boolean;
  customArgs: string;
  resolutionPreset: string;
  controllerProfile: string;
}

export interface AppSettings {
  theme: ThemePreference;
  language: "pt-BR" | "en-US";
  minimizeToTray: boolean;
  checkForUpdates: boolean;
  emulatorPaths: Partial<Record<Platform, string>>;
  libraryFolders: Partial<Record<Platform, LibraryFolderSettings>>;
  execution: ExecutionSettings;
}
