import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Treinos" };

export default function TreinosPage() {
  return (
    <>
      <PageHeader title="Treinos" />
      <EmptyState message="Ainda não há treinos. Vais poder planear o próximo aqui." />
    </>
  );
}
