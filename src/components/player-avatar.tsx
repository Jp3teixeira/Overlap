import { cn } from "@/lib/utils";

type PlayerAvatarProps = {
  name: string;
  shirtNumber?: number | null;
  /** URL assinado da foto (gerado no servidor). */
  photoUrl?: string | null;
  size?: "sm" | "lg";
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** Foto do jogador ou, sem foto, o número da camisola em navy. */
export function PlayerAvatar({ name, shirtNumber, photoUrl, size = "sm" }: PlayerAvatarProps) {
  const box = size === "lg" ? "size-16 text-2xl" : "size-10 text-base";
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- URL assinado de curta duração; sem otimização
    return <img src={photoUrl} alt="" className={cn("shrink-0 rounded-full object-cover", box)} />;
  }
  return (
    <span
      aria-hidden
      className={cn(
        "bg-primary text-primary-foreground inline-flex shrink-0 items-center justify-center rounded-full font-semibold [font-stretch:88%] tabular-nums",
        box,
      )}
    >
      {shirtNumber ?? initials(name)}
    </span>
  );
}
