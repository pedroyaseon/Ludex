import type { Platform } from "@/types/domain";
export interface MetadataRequest {
  title: string;
  platform: Platform;
  releaseYear?: number;
  serial?: string;
  region?: string;
}
export interface MetadataProvider<T> {
  isConfigured(): Promise<boolean>;
  fetch(request: MetadataRequest): Promise<T | null>;
}
