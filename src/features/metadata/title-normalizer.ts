export const normalizeGameTitle = (value: string) =>
  value
    .replace(/\.(iso|chd|bin|cue|pkg)$/i, "")
    .replace(/\[[^\]]*]|\([^)]*\)/g, " ")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
