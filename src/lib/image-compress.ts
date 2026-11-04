"use client";

import type { MediaExt } from "./media-path";

/**
 * Compressão de imagens no browser, antes do upload. Respeita a rotação EXIF
 * (as fotos do telemóvel não ficam de lado) e usa WebP sempre que o browser
 * consegue; senão JPEG (alguns Safari antigos não codificam WebP).
 */

type Compressed = { blob: Blob; ext: MediaExt };

/** Recorta o centro em quadrado e reduz para `size` px. Para fotos de jogadores. */
export async function compressToSquare(file: File, size: number): Promise<Compressed> {
  return draw(file, (w, h) => {
    const side = Math.min(w, h);
    const target = Math.min(size, side);
    return { sx: (w - side) / 2, sy: (h - side) / 2, sw: side, sh: side, dw: target, dh: target };
  });
}

/** Mantém a imagem inteira e limita o lado maior a `maxSide` px. Para esquemas de exercícios. */
export async function compressToFit(file: File, maxSide: number): Promise<Compressed> {
  return draw(file, (w, h) => {
    const scale = Math.min(1, maxSide / Math.max(w, h));
    return { sx: 0, sy: 0, sw: w, sh: h, dw: Math.round(w * scale), dh: Math.round(h * scale) };
  });
}

type Plan = { sx: number; sy: number; sw: number; sh: number; dw: number; dh: number };

async function draw(file: File, plan: (w: number, h: number) => Plan): Promise<Compressed> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Não foi possível ler esta imagem. Experimenta outra.");
  }

  try {
    const { sx, sy, sw, sh, dw, dh } = plan(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = dw;
    canvas.height = dh;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível processar a imagem.");
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, dw, dh);

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
