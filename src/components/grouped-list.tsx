import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Linhas agrupadas num só contentor (estilo Definições do iOS). Nunca cartões soltos. */
export function GroupedList({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn(
        "divide-border border-border bg-card divide-y overflow-hidden rounded-lg border",
        className,
      )}
      {...props}
    />
  );
}

type ListRowProps = {
  title: React.ReactNode;
  meta?: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  /** Marcador dourado "hoje / a seguir". Usar só aí. */
  marker?: boolean;
  href?: string;
  onClick?: () => void;
};

export function ListRow({ title, meta, leading, trailing, marker, href, onClick }: ListRowProps) {
  const content = (
    <>
      {marker && <span aria-hidden className="bg-marker absolute inset-y-0 left-0 w-[3px]" />}
      {leading && <span className="shrink-0">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base leading-[22px] font-medium">{title}</span>
        {meta && (
          <span className="text-muted-foreground mt-0.5 block truncate text-[13px] leading-[18px]">
            {meta}
          </span>
        )}
      </span>
      {trailing && <span className="shrink-0 text-[15px] tabular-nums">{trailing}</span>}
      {href && <ChevronRight aria-hidden className="text-muted-foreground size-5 shrink-0" />}
    </>
  );
  const rowClass =
    "relative flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left outline-none focus-visible:bg-muted";

  return (
    <li>
      {href ? (
        <Link href={href} className={cn(rowClass, "active:bg-muted")}>
          {content}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={cn(rowClass, "active:bg-muted")}>
          {content}
        </button>
      ) : (
        <div className={rowClass}>{content}</div>
      )}
    </li>
  );
}
