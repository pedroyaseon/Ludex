import { GameCard } from "@/components/GameCard";
import type { Game } from "@/types/domain";

interface GameGridProps {
  games: Game[];
}

export function GameGrid({ games }: GameGridProps) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {games.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
    </div>
  );
}

export function GameGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="aspect-[5/7] rounded-[18px] bg-white/[0.045]" />
          <div className="mt-3 h-3 w-3/4 rounded bg-white/[0.045]" />
          <div className="mt-2 h-2.5 w-1/2 rounded bg-white/[0.025]" />
        </div>
      ))}
    </div>
  );
}
