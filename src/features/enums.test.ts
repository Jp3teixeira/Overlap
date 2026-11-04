import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EXERCISE_TAGS } from "./exercises/labels";
import { MATCH_KINDS, MATCH_VENUES } from "./matches/labels";
import { DOMINANT_FEET, PLAYER_POSITIONS } from "./players/labels";
import { SESSION_STATUSES } from "./training/labels";

/** Lê os enums de todas as migrações (create type ... as enum + alter type ... add value). */
function enumsFromMigrations() {
  const dir = join(process.cwd(), "supabase/migrations");
  const sql = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(join(dir, f), "utf8").replace(/--.*$/gm, ""))
    .join("\n");

  const enums = new Map<string, string[]>();
  for (const m of sql.matchAll(/create type public\.(\w+)\s+as\s+enum\s*\(([^)]*)\)/g)) {
    enums.set(
      m[1],
      [...m[2].matchAll(/'([^']+)'/g)].map((v) => v[1]),
    );
  }
  for (const m of sql.matchAll(
    /alter type public\.(\w+)\s+add value\s+(?:if not exists\s+)?'([^']+)'/g,
  )) {
    enums.get(m[1])?.push(m[2]);
  }
  return enums;
}

describe("labels.ts batem certo com os enums da base de dados", () => {
  const db = enumsFromMigrations();
  it.each([
    ["player_position", PLAYER_POSITIONS],
    ["dominant_foot", DOMINANT_FEET],
    ["exercise_tag", EXERCISE_TAGS],
    ["match_kind", MATCH_KINDS],
    ["match_venue", MATCH_VENUES],
    ["session_status", SESSION_STATUSES],
  ] as const)("%s", (name, values) => {
    expect(db.get(name)).toEqual([...values]);
  });
});
