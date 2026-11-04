import { describe, expect, it } from "vitest";
import { groupPlayers, sortPlayersByPosition } from "./grouping";
import { positionChoices, primaryGroup } from "./labels";

const p = (
  name: string,
  shirt_number: number | null,
  positions: Parameters<typeof primaryGroup>[0],
) => ({
  name,
  shirt_number,
  positions,
});

describe("groupPlayers", () => {
  const squad = [
    p("Avançado A", 9, ["avancado"]),
    p("Médio A", 8, ["medio"]),
    p("Defesa B", 5, ["defesa"]),
    p("GR", 1, ["gr"]),
    p("Defesa A", 3, ["defesa"]),
    p("Sem posição", 20, []),
    p("Médio sem número", null, ["medio"]),
  ];

  it("ordena GR → defesas → médios → avançados e deixa os sem posição no fim", () => {
    expect(groupPlayers(squad).map((g) => g.label)).toEqual([
      "Guarda-redes",
      "Defesas",
      "Médios",
      "Avançados",
      "Sem posição definida",
    ]);
  });

  it("dentro do grupo ordena por número e deixa os sem número no fim", () => {
    const groups = groupPlayers(squad);
    expect(groups[1].players.map((x) => x.name)).toEqual(["Defesa A", "Defesa B"]);
    expect(groups[2].players.map((x) => x.name)).toEqual(["Médio A", "Médio sem número"]);
  });

  it("quem joga em duas posições fica no grupo da primeira escolhida", () => {
    const groups = groupPlayers([
      p("Polivalente", 6, ["medio", "avancado"]),
      p("Outro", 7, ["avancado", "medio"]),
    ]);
    expect(groups.map((g) => [g.label, g.players.map((x) => x.name)])).toEqual([
      ["Médios", ["Polivalente"]],
      ["Avançados", ["Outro"]],
    ]);
  });

  it("laterais contam como defesas e extremos como avançados (dados de futebol de 11)", () => {
    expect(primaryGroup(["lateral"])).toBe("defesas");
    expect(primaryGroup(["extremo"])).toBe("avancados");
  });

  it("não mostra grupos vazios e a lista plana segue a mesma ordem", () => {
    expect(groupPlayers([p("Só GR", 1, ["gr"])])).toHaveLength(1);
    expect(sortPlayersByPosition(squad).map((x) => x.name)[0]).toBe("GR");
  });
});

describe("positionChoices (futebol de 7)", () => {
  it("só oferece GR, defesa, médio e avançado", () => {
    expect(positionChoices().map((o) => o.value)).toEqual(["gr", "defesa", "medio", "avancado"]);
  });
  it("mantém uma posição antiga já escolhida, para a poder editar", () => {
    expect(positionChoices(["lateral"]).map((o) => o.value)).toContain("lateral");
  });
});
