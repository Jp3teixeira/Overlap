"use client";

import { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { runAction } from "@/lib/run-action";
import { saveMatchLive } from "../../actions";
import { emptyLive, liveReducer, liveSchema, score, type LiveState } from "../../live";
import { LiveBoard, type SyncState } from "./live-board";
import { LiveSetup } from "./live-setup";
import { LiveSummary } from "./live-summary";
import { toPlayerMap, type LivePlayer } from "./types";

const noopSubscribe = () => () => {};

/** Lê o jogo guardado no telemóvel (se for mais recente que o da BD, é o que conta). */
function readLocal(key: string): LiveState | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = liveSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function pickInitial(server: LiveState | null, local: LiveState | null): LiveState {
  if (server && local) return local.rev >= server.rev ? local : server;
  return local ?? server ?? emptyLive();
}

/** Um relógio que bate de segundo a segundo enquanto `active`. 0 até ao primeiro batimento. */
function useNow(active: boolean) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [active]);
  return now;
}

/** Mantém o ecrã ligado durante o jogo (o relógio não depende disto, mas poupa desbloquear). */
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
        if (cancelled) await lock.release();
      } catch {
        // sem permissão ou sem suporte: segue sem
      }
    };
    void request();
    const onVisible = () => {
      if (document.visibilityState === "visible") void request();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, [active]);
}

type Props = {
  matchId: string;
  opponent: string;
  teamName: string;
  players: LivePlayer[];
  initial: LiveState | null;
};

export function LiveMatch(props: Props) {
  // O estado vem do localStorage, que o servidor não tem: só desenha depois de montar.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  if (!mounted) return <Skeleton className="h-96 w-full" />;
  return <LiveMatchInner {...props} />;
}

function LiveMatchInner({ matchId, opponent, teamName, players, initial }: Props) {
  const storageKey = `overlap:live:${matchId}`;
  const [state, dispatch] = useReducer(liveReducer, null, () =>
    pickInitial(initial, readLocal(storageKey)),
  );
  const [sync, setSync] = useState<SyncState>({ kind: "saved" });

  const latest = useRef(state);
  const savedRev = useRef(initial?.rev ?? 0);
  const inFlight = useRef(false);

  const active =
    state.status === "running" || state.status === "paused" || state.status === "halftime";
  const nowMs = useNow(state.status === "running");
  useWakeLock(active);

  // Guarda sempre no telemóvel, a cada mudança.
  useEffect(() => {
    latest.current = state;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // armazenamento cheio ou bloqueado: continua só com a BD
    }
  }, [state, storageKey]);

  // Sincroniza com a BD: ordenado, uma gravação de cada vez, repete até estar em dia.
  const flush = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      while (latest.current.rev !== savedRev.current) {
        const snapshot = latest.current;
        setSync({ kind: "saving" });
        const res = await runAction(() => saveMatchLive(matchId, snapshot));
        if (!res.ok) {
          setSync({ kind: "offline", error: res.error });
          return;
        }
        savedRev.current = snapshot.rev;
      }
      setSync({ kind: "saved" });
    } finally {
      inFlight.current = false;
    }
  }, [matchId]);

  useEffect(() => {
    if (state.rev === savedRev.current) return;
    const t = setTimeout(() => void flush(), 1200);
    return () => clearTimeout(t);
  }, [state.rev, flush]);

  useEffect(() => {
    const onOnline = () => void flush();
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [flush]);

  useEffect(() => {
    if (sync.kind !== "offline") return;
    const interval = setInterval(() => void flush(), 10_000);
    return () => clearInterval(interval);
  }, [sync.kind, flush]);

  const newId = useCallback(() => crypto.randomUUID(), []);
  const result = score(state);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Link
          href={`/jogos/${matchId}`}
          className="text-primary -ml-1.5 inline-flex h-9 items-center gap-0.5 rounded-md pr-2 text-[15px] font-medium"
        >
          <ChevronLeft className="size-5" strokeWidth={2} />
          {opponent}
        </Link>
        <span className="text-muted-foreground text-[13px] font-medium">Jogo ao vivo</span>
      </div>

      {state.status === "setup" && (
        <LiveSetup
          state={state}
          dispatch={dispatch}
          players={players}
          onStart={() => dispatch({ type: "kickoff", now: Date.now() })}
        />
      )}

      {active && (
        <LiveBoard
          state={state}
          dispatch={dispatch}
          players={players}
          teamName={teamName}
          opponent={opponent}
          nowMs={nowMs}
          sync={sync}
          onRetry={() => void flush()}
          newId={newId}
        />
      )}

      {state.status === "finished" && (
        <div className="space-y-6">
          <div className="border-border bg-card rounded-lg border px-4 py-4 text-center">
            <p className="text-muted-foreground text-[13px] font-medium">Jogo terminado</p>
            <p className="mt-1 text-[48px] leading-none font-[750] tracking-tight [font-stretch:88%] tabular-nums">
              {result.us}–{result.them}
            </p>
            <p className="text-muted-foreground mt-2 text-[13px]">
              {sync.kind === "saved"
                ? "Resultado guardado no jogo."
                : sync.kind === "saving"
                  ? "A guardar…"
                  : "Sem sinal: fica guardado no telemóvel e sincroniza quando houver rede."}
            </p>
          </div>
          <LiveSummary
            live={state}
            players={toPlayerMap(players)}
            teamName={teamName}
            opponent={opponent}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => dispatch({ type: "reopen" })}
            >
              Reabrir jogo
            </Button>
            <Button asChild size="lg" className="flex-1">
              <Link href={`/jogos/${matchId}`}>Voltar ao jogo</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
