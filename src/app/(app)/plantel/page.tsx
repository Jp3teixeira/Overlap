import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Plantel" };

export default function PlantelPage() {
  return (
    <>
      <PageHeader title="Plantel" />
      <EmptyState message="Ainda não há jogadores. Vais poder adicionar o plantel aqui." />
    </>
  );
}
