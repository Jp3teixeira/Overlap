import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { Playground } from "./playground";

export const metadata: Metadata = { title: "Kit visual" };

// Temporária (tarefa 0.3): apagar quando o visual estiver validado.
export default function DevUiPage() {
  return (
    <AppShell>
      <Playground />
    </AppShell>
  );
}
