import { invoke } from "@tauri-apps/api/core";
import type {
  MetadataProvider,
  MetadataRequest,
} from "@/features/metadata/providers/metadata-provider";
import type { RawgMetadataResult } from "@/features/metadata/metadata.types";
export const rawgProvider: MetadataProvider<RawgMetadataResult> = {
  isConfigured: () => invoke<boolean>("is_rawg_configured"),
  fetch: (request: MetadataRequest) =>
    invoke("fetch_game_metadata", { title: request.title, platform: request.platform }),
};
