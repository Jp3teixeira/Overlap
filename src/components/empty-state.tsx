import { OverlapMark } from "./overlap-mark";

/** Estado vazio: diz o que fazer, com no máximo uma ação. */
export function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="border-border bg-card rounded-lg border border-dashed px-4 py-6">
      <OverlapMark className="text-primary/25 mb-3" />
      <p className="text-muted-foreground text-[15px] leading-[22px]">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
