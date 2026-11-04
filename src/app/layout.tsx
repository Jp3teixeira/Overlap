import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Archivo variável (pesos 100–900, larguras 62–125%), servida a partir do próprio site.
const archivo = localFont({
  src: [
    { path: "../fonts/archivo-latin-standard-normal.woff2", style: "normal" },
    { path: "../fonts/archivo-latin-ext-standard-normal.woff2", style: "normal" },
  ],
  weight: "100 900",
  variable: "--font-archivo",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
});

export const metadata: Metadata = {
  title: { default: "Overlap", template: "%s · Overlap" },
  description: "Ferramenta da equipa técnica do Candal Sub-11.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#12306B",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-PT" className={archivo.variable}>
      <body className="min-h-dvh">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
