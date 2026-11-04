import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Exercícios" };

export default function ExerciciosPage() {
  return (
    <>
      <PageHeader title="Exercícios" />
      <EmptyState message="A biblioteca está vazia. Vais poder adicionar os exercícios que usam aqui." />
    </>
  );
}
