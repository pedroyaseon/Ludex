import { invoke } from "@tauri-apps/api/core";
import type {
  MetadataProvider,
  MetadataRequest,
} from "@/features/metadata/providers/metadata-provider";
import type { IgdbMetadataResult } from "@/features/metadata/metadata.types";
export const igdbProvider: MetadataProvider<IgdbMetadataResult> = {
  isConfigured: () => invoke<boolean>("is_igdb_configured"),
  fetch: (request: MetadataRequest) =>
    invoke("fetch_igdb_metadata", {
      title: request.title,
      platform: request.platform,
      releaseYear: request.releaseYear,
    }),
};
