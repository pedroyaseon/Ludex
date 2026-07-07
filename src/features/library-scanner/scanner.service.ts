import { invoke } from "@tauri-apps/api/core";
import type { ScanRequest, ScanResult } from "@/features/library-scanner/scanner.types";

export const scannerService = {
  async preview(request: ScanRequest): Promise<ScanResult> {
    return invoke<ScanResult>("scan_library_folder", {
      folderPath: request.folderPath,
      platform: request.platform,
      recursive: request.recursive,
    });
  },
};
