"use client";

import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PlayerAvatar } from "@/components/player-avatar";
import { Button } from "@/components/ui/button";
import { compressToSquare } from "@/lib/image-compress";
import { MEDIA_BUCKET, newMediaPath } from "@/lib/media-path";
import { runAction } from "@/lib/run-action";
import { createClient } from "@/lib/supabase/client";
import { removePlayerPhoto, setPlayerPhoto } from "../actions";
import type { PlayerRow } from "../types";

const PHOTO_SIZE = 512;

/**
 * Foto do jogador, no formulário de edição. A foto é enviada logo ao escolher
 * (não espera pelo "Guardar"): comprime no telemóvel, envia para o bucket privado
 * e só depois pede ao servidor para a associar ao jogador.
 */
export function PhotoField({ player }: { player: PlayerRow }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    let uploaded: string | null = null;
    try {
      const { blob, ext } = await compressToSquare(file, PHOTO_SIZE);
      const path = newMediaPath(player.team_id, "players", player.id, ext);
      const supabase = createClient();
      const { error } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, blob, { contentType: blob.type, cacheControl: "3600" });
      if (error)
        throw new Error("Não foi possível enviar a foto. Verifica a rede e tenta outra vez.");
      uploaded = path;

      const result = await runAction(() => setPlayerPhoto(player.id, path));
      if (!result.ok) throw new Error(result.error);
      uploaded = null;
      toast.success("Foto atualizada");
    } catch (e) {
      // Se o envio correu bem mas a associação falhou, não deixar um ficheiro órfão.
      if (uploaded) await createClient().storage.from(MEDIA_BUCKET).remove([uploaded]);
      toast.error(e instanceof Error ? e.message : "Não foi possível guardar a foto.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onRemove() {
    setBusy(true);
    const result = await runAction(() => removePlayerPhoto(player.id));
    setBusy(false);
    if (result.ok) toast.success("Foto removida");
    else toast.error(result.error);
  }

  return (
    <div className="flex items-center gap-4">
      <PlayerAvatar
        name={player.name}
        shirtNumber={player.shirt_number}
        photoUrl={player.photo_url}
        size="lg"
      />
      <div className="flex flex-col items-start gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <Camera />
          {busy ? "A enviar…" : player.photo_url ? "Mudar foto" : "Tirar ou escolher foto"}
        </Button>
        {player.photo_url && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={onRemove}
            disabled={busy}
          >
            <Trash2 />
            Remover foto
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => onFile(e.target.files?.[0])}
      />
    </div>
  );
}
