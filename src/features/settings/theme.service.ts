import type { ThemePreference } from "@/features/settings/settings.types";

const settingsStorageKey = "ludex.settings.v1";
const systemThemeQuery = "(prefers-color-scheme: dark)";

const resolveTheme = (preference: ThemePreference): "dark" | "light" => {
  if (preference !== "system") return preference;
  return window.matchMedia(systemThemeQuery).matches ? "dark" : "light";
};

const readStoredPreference = (): ThemePreference => {
  try {
    const value = JSON.parse(window.localStorage.getItem(settingsStorageKey) ?? "{}") as {
      theme?: ThemePreference;
    };
    return value.theme === "light" || value.theme === "system" ? value.theme : "dark";
  } catch {
    return "dark";
  }
};

export const themeService = {
  apply(preference: ThemePreference) {
    document.documentElement.dataset.theme = resolveTheme(preference);
    document.documentElement.style.colorScheme = resolveTheme(preference);
  },

  initialize() {
    let preference = readStoredPreference();
    this.apply(preference);

    const handleSettingsUpdated = () => {
      preference = readStoredPreference();
      this.apply(preference);
    };
    const handleSystemThemeChanged = () => {
      if (preference === "system") this.apply(preference);
    };

    window.addEventListener("ludex:settings-updated", handleSettingsUpdated);
    window.matchMedia(systemThemeQuery).addEventListener("change", handleSystemThemeChanged);
  },
};
