"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { LivePlayer } from "./types";

/**
 * Bolinha de um jogador: a foto com o número num selo ou, sem foto (ou se ela falhar), só o número.
 * `className` traz as cores/bordas de cada sítio; `background` pinta o número e o selo (campo).
 */
export function LiveAvatar({
  player,
  size,
  background,
  className,
}: {
  player: Pick<LivePlayer, "shirt_number" | "photo_url"> | undefined;
  size: "pitch" | "chip";
  background?: string;
  className?: string;
}) {
  const url = player?.photo_url ?? null;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = url !== null && failedUrl !== url;
  const number = player?.shirt_number ?? "–";
  const dims = size === "pitch" ? "size-12 text-[17px]" : "size-9 text-[15px]";

  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full font-bold [font-stretch:88%] tabular-nums",
        dims,
        className,
      )}
      style={showPhoto || !background ? undefined : { background }}
    >
      {showPhoto ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- URL assinado de curta duração; sem otimização */}
          <img
            src={url}
            alt=""
            draggable={false}
            onError={() => setFailedUrl(url)}
            // Se a imagem já falhou antes de a página ficar interativa, o onError perdeu-se.
            ref={(el) => {
              if (el && el.complete && el.naturalWidth === 0) setFailedUrl(url);
            }}
            className="size-full rounded-full object-cover"
          />
          <span
            className={cn(
              "absolute -right-1 -bottom-1 grid h-[18px] min-w-[18px] place-items-center rounded-full border border-white px-1 text-[11px] leading-none text-white",
              !background && "bg-primary",
            )}
            style={background ? { background } : undefined}
          >
            {number}
          </span>
        </>
      ) : (
        number
      )}
    </span>
  );
}
