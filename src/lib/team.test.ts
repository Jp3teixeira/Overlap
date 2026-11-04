import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const { toCurrentTeam } = await import("./team");

const user = "aaaaaaaa-0000-4000-8000-000000000001";
const team = { id: "11111111-1111-4111-8111-111111111111", name: "Candal Sub-11" };

describe("toCurrentTeam", () => {
  it("owner e coach podem editar", () => {
    expect(toCurrentTeam({ role: "owner", display_name: "João", team }, user)).toEqual({
      id: team.id,
      name: "Candal Sub-11",
      role: "owner",
      displayName: "João",
      canEdit: true,
      userId: user,
    });
    expect(toCurrentTeam({ role: "coach", display_name: "Tiago", team }, user)?.canEdit).toBe(true);
  });
  it("staff só lê", () => {
    expect(toCurrentTeam({ role: "staff", display_name: "Fernando", team }, user)?.canEdit).toBe(
      false,
    );
  });
  it("linha sem equipa ou com papel desconhecido = sem acesso", () => {
    expect(toCurrentTeam({ role: "coach", display_name: "X", team: null }, user)).toBeNull();
    expect(toCurrentTeam({ role: "admin", display_name: "X", team }, user)).toBeNull();
  });
});
