import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { gamesService } from "@/features/games/games.service";
import { settingsService } from "@/features/settings/settings.service";

export const libraryUpdatedEvent = "ludex:library-updated";
export const libraryMonitorStatusEvent = "ludex:library-monitor-status";

export type LibraryMonitorStatus = "starting" | "watching" | "syncing" | "error" | "idle";

const notifyStatus = (status: LibraryMonitorStatus) => {
  window.dispatchEvent(new CustomEvent(libraryMonitorStatusEvent, { detail: status }));
};

const notifyLibraryUpdated = () => {
  window.dispatchEvent(new Event(libraryUpdatedEvent));
};

export const libraryMonitorService = {
  async start(): Promise<() => void> {
    let debounceTimer: number | undefined;
    let syncRunning = false;
    let syncPending = false;

    const sync = async () => {
      if (syncRunning) {
        syncPending = true;
        return;
      }

      syncRunning = true;
      notifyStatus("syncing");
      try {
        await gamesService.syncConfiguredLibrary("PS2");
        notifyLibraryUpdated();
        notifyStatus("watching");
      } catch {
        notifyStatus("error");
      } finally {
        syncRunning = false;
        if (syncPending) {
          syncPending = false;
          void sync();
        }
      }
    };

    const configure = async () => {
      notifyStatus("starting");
      const settings = await settingsService.get();
      const folder = settings.libraryFolders.PS2;

      if (!folder?.autoScan || !folder.folderPath.trim()) {
        notifyStatus("idle");
        return;
      }

      await invoke("watch_library_folder", {
        folderPath: folder.folderPath,
        recursive: folder.recursiveScan,
      });
      notifyStatus("watching");
      await sync();
    };

    const unlisten: UnlistenFn = await listen("library://changed", () => {
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => void sync(), 650);
    });

    const handleSettingsChanged = () => void configure().catch(() => notifyStatus("error"));
    window.addEventListener("ludex:settings-updated", handleSettingsChanged);
    void configure().catch(() => notifyStatus("error"));

    return () => {
      window.clearTimeout(debounceTimer);
      window.removeEventListener("ludex:settings-updated", handleSettingsChanged);
      unlisten?.();
    };
  },
};
