/**
 * Caminhos dos ficheiros no bucket privado `team-media` (puro, sem I/O).
 * Formato: {team_id}/{players|exercises}/{owner_id}/{uuid}.{webp|jpg}
 * A RLS do Storage só olha para o team_id; o resto é verificado aqui, nas Server Actions.
 */

export const MEDIA_BUCKET = "team-media";
/** Duração dos URLs assinados (segundos). */
export const SIGNED_URL_SECONDS = 60 * 60;

export type MediaKind = "players" | "exercises";
export type MediaExt = "webp" | "jpg";

const FILE_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg)$/;

export function newMediaPath(teamId: string, kind: MediaKind, ownerId: string, ext: MediaExt) {
  return `${teamId}/${kind}/${ownerId}/${crypto.randomUUID()}.${ext}`;
}

/** O caminho pertence mesmo a esta equipa, tipo e dono (jogador/exercício)? */
export function isOwnMediaPath(
  path: string,
  teamId: string,
  kind: MediaKind,
  ownerId: string,
): boolean {
  const parts = path.split("/");
  return (
    parts.length === 4 &&
    parts[0] === teamId &&
    parts[1] === kind &&
    parts[2] === ownerId &&
    FILE_NAME.test(parts[3])
  );
}
