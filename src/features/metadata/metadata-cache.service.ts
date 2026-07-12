const cacheWindowMs = 24 * 60 * 60 * 1000;
export const metadataCacheService = {
  isFresh(updatedAt?: string) {
    return Boolean(updatedAt && Date.now() - new Date(updatedAt).getTime() < cacheWindowMs);
  },
};
