import { describe, expect, it } from "vitest";
import {
  filtersToUrl,
  formatDuration,
  formatPlayers,
  formatRest,
  parseFilters,
  searchPattern,
  variantName,
} from "./filters";

describe("parseFilters", () => {
  it("sem params devolve filtros vazios", () => {
    expect(parseFilters({})).toEqual({ q: "", tags: [], archived: false });
  });

  it("lê pesquisa, etiquetas válidas (pela ordem da lista) e arquivados", () => {
    expect(parseFilters({ q: "  rondo ", tags: "transicoes,posse", arq: "1" })).toEqual({
      q: "rondo",
      tags: ["posse", "transicoes"],
      archived: true,
    });
  });

  it("ignora etiquetas desconhecidas e aceita arrays (param repetido)", () => {
    expect(parseFilters({ tags: "posse,nao_existe,;drop table" }).tags).toEqual(["posse"]);
    expect(parseFilters({ q: ["a", "b"], tags: ["finalizacao"] })).toMatchObject({
      q: "a",
      tags: ["finalizacao"],
    });
  });

  it("limita o tamanho da pesquisa", () => {
    expect(parseFilters({ q: "x".repeat(300) }).q).toHaveLength(80);
  });
});

describe("filtersToUrl", () => {
  it("é o inverso de parseFilters", () => {
    const f = { q: "1x1", tags: ["duelo_1x1" as const, "posse" as const], archived: true };
    const url = filtersToUrl(f);
    const sp = new URL(url, "https://x.pt").searchParams;
    expect(
      parseFilters({
        q: sp.get("q") ?? undefined,
        tags: sp.get("tags") ?? undefined,
        arq: sp.get("arq") ?? undefined,
      }),
    ).toEqual(f);
  });
  it("sem filtros fica só o caminho", () => {
    expect(filtersToUrl({ q: " ", tags: [], archived: false })).toBe("/exercicios");
  });
});

describe("searchPattern", () => {
  it("embrulha em % para pesquisar em qualquer parte do texto", () => {
    expect(searchPattern("rondo")).toBe("%rondo%");
  });
  it("neutraliza curingas e sintaxe do PostgREST", () => {
    expect(searchPattern("100%_(a),b*")).toBe("%100 a b%");
    expect(searchPattern('x\\"y')).toBe("%x y%");
  });
  it("texto vazio ou só símbolos não filtra", () => {
    expect(searchPattern("   ")).toBeNull();
    expect(searchPattern("%%__")).toBeNull();
  });
});

describe("formatPlayers", () => {
  it("mostra o mínimo com +", () => {
    expect(formatPlayers(6)).toBe("6+");
    expect(formatPlayers(null)).toBe("");
  });
});

describe("formatDuration", () => {
  it("junta minutos e séries", () => {
    expect(formatDuration(3, 3)).toBe("3 min × 3");
    expect(formatDuration(10, 1)).toBe("10 min");
    expect(formatDuration(10, null)).toBe("10 min");
    expect(formatDuration(null, 4)).toBe("4 séries");
    expect(formatDuration(null, null)).toBe("");
  });
});

describe("formatRest", () => {
  it("formata segundos e minutos", () => {
    expect(formatRest(30)).toBe("30 s");
    expect(formatRest(0)).toBe("0 s");
    expect(formatRest(60)).toBe("1 min");
    expect(formatRest(90)).toBe("1 min 30 s");
    expect(formatRest(null)).toBe("");
  });
});

describe("variantName", () => {
  it("acrescenta (variante)", () => {
    expect(variantName("Rondo 4x2")).toBe("Rondo 4x2 (variante)");
  });
  it("nunca passa os 80 caracteres", () => {
    expect(variantName("x".repeat(80))).toHaveLength(80);
    expect(variantName("x".repeat(80)).endsWith(" (variante)")).toBe(true);
  });
});
