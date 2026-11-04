"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChipGroup } from "@/components/chip";
import { GroupedList, ListRow } from "@/components/grouped-list";
import { MinutesStepper } from "@/components/minutes-stepper";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { PlayerAvatar } from "@/components/player-avatar";
import { ResponsiveSheet } from "@/components/responsive-sheet";
import { formatScore, ResultBadge } from "@/components/result-badge";
import { Segmented } from "@/components/segmented";
import { TimeBar } from "@/components/time-bar";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { venueOptions, type MatchVenue } from "@/features/matches/labels";
import { formatPositions, positionOptions, type PlayerPosition } from "@/features/players/labels";
import { tagOptions, type ExerciseTag } from "@/features/exercises/labels";
import { formatDayShort } from "@/lib/dates";

// Dados inventados — nunca dados reais de jogadores.
const ITEMS_START = [
  { id: "1", title: "Aquecimento", duration_min: 5 },
  { id: "2", title: "Jogo do Galo", duration_min: 10 },
  { id: "3", title: "1x1 + Transição", duration_min: 15 },
  { id: "4", title: "Holandês 4x4+3", duration_min: 15 },
  { id: "5", title: "Jogo final", duration_min: 15 },
];

export function Playground() {
  const [items, setItems] = useState(ITEMS_START);
  const [positions, setPositions] = useState<PlayerPosition[]>(["extremo", "medio"]);
  const [tags, setTags] = useState<ExerciseTag[]>(["duelo_1x1"]);
  const [venue, setVenue] = useState<MatchVenue>("casa");
  const [open, setOpen] = useState(false);

  const setMinutes = (id: string, duration_min: number) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, duration_min } : i)));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Kit visual"
        subtitle="Página temporária para validar o visual no telemóvel. Dados inventados."
        back={{ href: "/", label: "Início" }}
      />

      <section>
        <SectionTitle>Treino</SectionTitle>
        <div className="border-border bg-card rounded-lg border p-4">
          <p className="text-[15px] font-medium">Quarta, 4 nov, 19:15</p>
          <p className="text-muted-foreground mb-3 text-[13px]">Objetivo: reação à perda</p>
          <TimeBar items={items} targetMin={60} />
        </div>
        <ol className="divide-border border-border bg-card mt-3 divide-y overflow-hidden rounded-lg border">
          {items.map((item, i) => (
            <li key={item.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
              <span className="text-muted-foreground w-5 text-[15px] font-semibold tabular-nums">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-base font-medium">{item.title}</span>
              <MinutesStepper
                label={`Minutos de ${item.title}`}
                value={item.duration_min}
                onChange={(v) => setMinutes(item.id, v)}
              />
            </li>
          ))}
        </ol>
      </section>

      <section>
        <SectionTitle>Plantel</SectionTitle>
        <GroupedList>
          <ListRow
            href="/dev/ui"
            leading={<PlayerAvatar name="Jogador Sete" shirtNumber={7} />}
            title="Jogador Sete"
            meta={formatPositions(["extremo", "medio"])}
          />
          <ListRow
            href="/dev/ui"
            leading={<PlayerAvatar name="Jogador Um" shirtNumber={1} />}
            title="Jogador Um"
            meta={formatPositions(["gr"])}
          />
          <ListRow
            href="/dev/ui"
            leading={<PlayerAvatar name="Sem Número" />}
            title="Sem Número"
            meta="Sem posição"
          />
        </GroupedList>
      </section>

      <section>
        <SectionTitle>Jogos</SectionTitle>
        <GroupedList>
          <ListRow
            marker
            href="/dev/ui"
            title="Adversário A"
            meta={`${formatDayShort("2026-11-08")}, 11:00, fora`}
          />
          <ListRow
            href="/dev/ui"
            title="Adversário B"
            meta={formatDayShort("2026-11-01")}
            trailing={
              <span className="flex items-center gap-2">
                <ResultBadge goalsFor={3} goalsAgainst={1} />
                {formatScore(3, 1)}
              </span>
            }
          />
          <ListRow
            href="/dev/ui"
            title="Adversário C"
            meta={formatDayShort("2026-10-25")}
            trailing={
              <span className="flex items-center gap-2">
                <ResultBadge goalsFor={2} goalsAgainst={2} />
                {formatScore(2, 2)}
              </span>
            }
          />
          <ListRow
            href="/dev/ui"
            title="Adversário D"
            meta={formatDayShort("2026-10-18")}
            trailing={
              <span className="flex items-center gap-2">
                <ResultBadge goalsFor={0} goalsAgainst={1} />
                {formatScore(0, 1)}
              </span>
            }
          />
        </GroupedList>
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle>Formulários</SectionTitle>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="demo-name">Nome</Label>
          <Input id="demo-name" placeholder="Como é chamado no campo" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Posições</Label>
          <ChipGroup
            aria-label="Posições"
            options={positionOptions}
            value={positions}
            onChange={setPositions}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Etiquetas</Label>
          <ChipGroup aria-label="Etiquetas" options={tagOptions} value={tags} onChange={setTags} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Local</Label>
          <Segmented aria-label="Local" options={venueOptions} value={venue} onChange={setVenue} />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => setOpen(true)}>Adicionar observação</Button>
          <Button variant="outline" onClick={() => toast.success("Observação guardada")}>
            Testar toast
          </Button>
          <Button
            variant="ghost"
            onClick={() => toast.error("Não foi possível guardar. Tenta outra vez.")}
          >
            Testar erro
          </Button>
        </div>
      </section>

      <ResponsiveSheet
        open={open}
        onOpenChange={setOpen}
        title="Observação"
        description="Jogador Sete, no treino de hoje"
        footer={
          <>
            <Button
              onClick={() => {
                setOpen(false);
                toast.success("Observação guardada");
              }}
            >
              Guardar
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </>
        }
      >
        <Textarea
          autoFocus
          aria-label="Observação"
          placeholder="O que viste? Podes usar o ditado do teclado."
        />
      </ResponsiveSheet>
    </div>
  );
}
