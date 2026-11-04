"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { compressToFit } from "@/lib/image-compress";
import { MEDIA_BUCKET, newMediaPath } from "@/lib/media-path";
import { runAction } from "@/lib/run-action";
import { createClient } from "@/lib/supabase/client";
import { removeExerciseImage, setExerciseImage } from "../actions";

const MAX_SIDE = 1600;

/**
 * Esquema do exercício (foto do quadro, desenho...). Enviado logo ao escolher:
 * comprime no telemóvel, envia para o bucket privado e depois associa ao exercício.
 */
export function ImageField({
  exerciseId,
  teamId,
  imageUrl,
}: {
  exerciseId: string;
  teamId: string;
  imageUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    let uploaded: string | null = null;
    try {
      const { blob, ext } = await compressToFit(file, MAX_SIDE);
      const path = newMediaPath(teamId, "exercises", exerciseId, ext);
      const supabase = createClient();
      const { error } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, blob, { contentType: blob.type, cacheControl: "3600" });
      if (error)
        throw new Error("Não foi possível enviar a imagem. Verifica a rede e tenta outra vez.");
      uploaded = path;

      const result = await runAction(() => setExerciseImage(exerciseId, path));
      if (!result.ok) throw new Error(result.error);
      uploaded = null;
      toast.success("Imagem atualizada");
    } catch (e) {
      if (uploaded) await createClient().storage.from(MEDIA_BUCKET).remove([uploaded]);
      toast.error(e instanceof Error ? e.message : "Não foi possível guardar a imagem.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onRemove() {
    setBusy(true);
    const result = await runAction(() => removeExerciseImage(exerciseId));
    setBusy(false);
    if (result.ok) toast.success("Imagem removida");
    else toast.error(result.error);
  }

  return (
    <div className="flex flex-col gap-3">
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- URL assinado de curta duração
        <img
          src={imageUrl}
          alt="Esquema do exercício"
          className="border-border max-h-56 w-full rounded-lg border object-contain"
        />
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <ImagePlus />
          {busy ? "A enviar…" : imageUrl ? "Mudar imagem" : "Juntar esquema ou foto"}
        </Button>
        {imageUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={onRemove}
            disabled={busy}
          >
            <Trash2 />
            Remover
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
