import type { Platform } from "@/types/domain";

export const supportedExtensions: Record<Platform, readonly string[]> = {
  PS2: [".iso", ".chd", ".bin", ".cue"],
  PS3: ["game-folder", ".pkg"],
};

export interface ScanRequest {
  folderPath: string;
  platform: Platform;
  recursive: boolean;
}

export interface ScannedFile {
  path: string;
  fileName: string;
  extension: string;
  platform: Platform;
}

export interface ScanResult {
  request: ScanRequest;
  files: ScannedFile[];
  ignoredCount: number;
  durationMilliseconds: number;
  mocked: boolean;
}
