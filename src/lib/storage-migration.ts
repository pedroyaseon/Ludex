export const readMigratedStorage = (currentKey: string, legacyKeys: string[]): string | null => {
  const currentValue = window.localStorage.getItem(currentKey);
  if (currentValue !== null) return currentValue;

  for (const legacyKey of legacyKeys) {
    const legacyValue = window.localStorage.getItem(legacyKey);
    if (legacyValue === null) continue;

    window.localStorage.setItem(currentKey, legacyValue);
    return legacyValue;
  }

  return null;
};
