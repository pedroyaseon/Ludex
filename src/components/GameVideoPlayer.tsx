import { Play, Youtube } from "lucide-react";
import { useMemo, useState } from "react";
import {
  isValidYoutubeVideoId,
  youtubeEmbedUrl,
  youtubeThumbnailUrl,
} from "@/features/metadata/youtube";
import type { GameVideo } from "@/types/domain";

interface GameVideoPlayerProps {
  gameTitle: string;
  videos: GameVideo[];
}

export function GameVideoPlayer({ gameTitle, videos }: GameVideoPlayerProps) {
  const safeVideos = useMemo(
    () => videos.filter((video) => isValidYoutubeVideoId(video.externalId)),
    [videos],
  );
  const [selectedId, setSelectedId] = useState(() => safeVideos[0]?.externalId);
  const selectedVideo =
    safeVideos.find((video) => video.externalId === selectedId) ?? safeVideos[0];

  if (!selectedVideo) return null;

  const embedUrl = youtubeEmbedUrl(selectedVideo.externalId);
  if (!embedUrl) return null;

  return (
    <section aria-labelledby="game-videos-heading">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-400">
            <Youtube size={18} />
            <h2 id="game-videos-heading" className="text-base font-semibold text-white">
              Vídeos
            </h2>
          </div>
        </div>
        <span className="text-[10px] font-semibold tracking-[0.12em] text-zinc-600 uppercase">
          {safeVideos.length} {safeVideos.length === 1 ? "vídeo" : "vídeos"}
        </span>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_230px]">
        <div className="aspect-video overflow-hidden rounded-[22px] border border-white/[0.08] bg-black shadow-[0_24px_70px_rgba(0,0,0,.35)]">
          <iframe
            key={selectedVideo.externalId}
            src={embedUrl}
            title={selectedVideo.title ?? `Vídeo de ${gameTitle}`}
            className="size-full border-0"
            loading="lazy"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation"
          />
        </div>

        {safeVideos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 xl:max-h-[min(30vw,430px)] xl:flex-col xl:overflow-y-auto xl:pr-1">
            {safeVideos.map((video) => {
              const isSelected = video.externalId === selectedVideo.externalId;
              return (
                <button
                  type="button"
                  key={video.externalId}
                  onClick={() => setSelectedId(video.externalId)}
                  aria-pressed={isSelected}
                  className={`group/video w-44 shrink-0 overflow-hidden rounded-xl border text-left transition-colors xl:w-full ${
                    isSelected
                      ? "border-brand-300/30 bg-brand-500/10"
                      : "border-white/[0.07] bg-white/[0.025] hover:border-white/15"
                  }`}
                >
                  <div className="relative aspect-video overflow-hidden bg-zinc-950">
                    <img
                      src={youtubeThumbnailUrl(video.externalId)}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover opacity-80 transition-transform group-hover/video:scale-[1.03]"
                    />
                    <span className="absolute inset-0 grid place-items-center">
                      <span className="grid size-8 place-items-center rounded-full bg-black/70 text-white backdrop-blur-sm">
                        <Play size={12} fill="currentColor" />
                      </span>
                    </span>
                  </div>
                  <p className="truncate px-3 py-2.5 text-[11px] font-semibold text-zinc-300">
                    {video.title ?? "Trailer"}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
