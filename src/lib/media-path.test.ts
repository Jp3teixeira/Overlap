import { describe, expect, it } from "vitest";
import { isOwnMediaPath, newMediaPath } from "./media-path";

const TEAM = "11111111-1111-4111-8111-111111111111";
const OTHER_TEAM = "22222222-2222-4222-8222-222222222222";
const PLAYER = "33333333-3333-4333-8333-333333333333";
const OTHER_PLAYER = "44444444-4444-4444-8444-444444444444";

describe("media-path", () => {
  it("um caminho novo passa na própria validação", () => {
    expect(
      isOwnMediaPath(newMediaPath(TEAM, "players", PLAYER, "webp"), TEAM, "players", PLAYER),
    ).toBe(true);
    expect(
      isOwnMediaPath(newMediaPath(TEAM, "players", PLAYER, "jpg"), TEAM, "players", PLAYER),
    ).toBe(true);
  });

  it("rejeita outra equipa, outro dono ou outro tipo", () => {
    const path = newMediaPath(TEAM, "players", PLAYER, "webp");
    expect(isOwnMediaPath(path, OTHER_TEAM, "players", PLAYER)).toBe(false);
    expect(isOwnMediaPath(path, TEAM, "players", OTHER_PLAYER)).toBe(false);
    expect(isOwnMediaPath(path, TEAM, "exercises", PLAYER)).toBe(false);
  });

  it("rejeita caminhos malformados ou com travessia", () => {
    const ok = newMediaPath(TEAM, "players", PLAYER, "webp");
    expect(isOwnMediaPath(`${ok}/extra`, TEAM, "players", PLAYER)).toBe(false);
    expect(isOwnMediaPath(`${TEAM}/players/${PLAYER}/../x.webp`, TEAM, "players", PLAYER)).toBe(
      false,
    );
    expect(isOwnMediaPath(`${TEAM}/players/${PLAYER}/foto.webp`, TEAM, "players", PLAYER)).toBe(
      false,
    );
    expect(
      isOwnMediaPath(
        `${TEAM}/players/${PLAYER}/${crypto.randomUUID()}.png`,
        TEAM,
        "players",
        PLAYER,
      ),
    ).toBe(false);
    expect(isOwnMediaPath("", TEAM, "players", PLAYER)).toBe(false);
  });
});
