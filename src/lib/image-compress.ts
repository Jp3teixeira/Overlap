"use client";

import type { MediaExt } from "./media-path";

/**
 * Recorta o centro da imagem em quadrado, reduz para `size` px e comprime (corre no browser).
 * WebP sempre que o browser consegue; senão JPEG (alguns Safari antigos não codificam WebP).
 * Respeita a rotação EXIF, para as fotos do telemóvel não ficarem de lado.
 */
export async function compressToSquare(
  file: File,
  size: number,
): Promise<{ blob: Blob; ext: MediaExt }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Não foi possível ler esta imagem. Experimenta outra foto.");
  }

  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const target = Math.min(size, side);
    const canvas = document.createElement("canvas");
    canvas.width = target;
    canvas.height = target;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível processar a imagem.");
    ctx.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      target,
      target,
    );

    const webp = await toBlob(canvas, "image/webp", 0.82);
    if (webp?.type === "image/webp") return { blob: webp, ext: "webp" };
    const jpg = await toBlob(canvas, "image/jpeg", 0.85);
    if (jpg) return { blob: jpg, ext: "jpg" };
    throw new Error("Não foi possível processar a imagem.");
  } finally {
    bitmap.close();
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}
