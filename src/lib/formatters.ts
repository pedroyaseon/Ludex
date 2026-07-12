export function formatPlaytime(totalSeconds: number) {
  if (totalSeconds <= 0) {
    return "0 min";
  }

  if (totalSeconds < 3600) {
    return `${Math.max(1, Math.round(totalSeconds / 60))} min`;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  return minutes ? `${hours}h ${minutes}min` : `${hours}h`;
}

export function formatLastPlayed(isoDate?: string) {
  if (!isoDate) return "Ainda não jogado";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(isoDate));
}
