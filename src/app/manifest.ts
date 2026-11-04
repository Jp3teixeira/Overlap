import type { MetadataRoute } from "next";

// App instalável no ecrã principal (6.2). Sem service worker: o Overlap é só online.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Overlap",
    short_name: "Overlap",
    description: "Ferramenta da equipa técnica do Candal Sub-11.",
    lang: "pt-PT",
    start_url: "/",
    display: "standalone",
    background_color: "#F3F5F8",
    theme_color: "#12306B",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
