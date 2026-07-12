import { invoke } from "@tauri-apps/api/core";

export const nativeDialogs = {
  async pickFolder(defaultPath?: string): Promise<string | undefined> {
    return invoke<string | null>("pick_folder", { defaultPath }).then((path) => path ?? undefined);
  },

  async pickExecutable(defaultPath?: string): Promise<string | undefined> {
    return invoke<string | null>("pick_executable", { defaultPath }).then(
      (path) => path ?? undefined,
    );
  },
};
