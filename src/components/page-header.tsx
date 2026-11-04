import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type PageHeaderProps = {
  title: string;
  /** Texto curto por baixo do título (data, contexto). */
  subtitle?: React.ReactNode;
  back?: { href: string; label: string };
  action?: React.ReactNode;
};

export function PageHeader({ title, subtitle, back, action }: PageHeaderProps) {
  return (
    <header className="mb-6">
      {back && (
        <Link
          href={back.href}
          className="text-primary mb-2 -ml-1.5 inline-flex h-9 items-center gap-0.5 rounded-md pr-2 text-[15px] font-medium"
        >
          <ChevronLeft className="size-5" strokeWidth={2} />
          {back.label}
        </Link>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[26px] leading-[30px] font-[650] tracking-tight">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-1 text-[15px]">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}

/** Título de secção dentro de uma página. */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 text-xl leading-[26px] font-semibold">{children}</h2>;
}
