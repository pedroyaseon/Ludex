export const normalizeGameTitle = (value: string) =>
  value
    .replace(/\[[^\]]*]|\([^)]*(?:USA|Europe|Japan|Disc|Disk|Rev)[^)]*\)/gi, " ")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
