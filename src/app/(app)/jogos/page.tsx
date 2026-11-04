import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Jogos" };

export default function JogosPage() {
  return (
    <>
      <PageHeader title="Jogos" />
      <EmptyState message="Ainda não há jogos. Vais poder adicionar o calendário da época aqui." />
    </>
  );
}
