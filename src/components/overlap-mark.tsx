import { cn } from "@/lib/utils";

/** O símbolo "overlap": dois círculos que se cruzam. A interseção é o que é comum aos dois. */
export function OverlapMark({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 24"
      fill="none"
      aria-hidden
      className={cn("h-6 w-10", className)}
    >
      <circle cx="14" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <circle cx="26" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path
        d="M20 3.6a10 10 0 0 1 0 16.8 10 10 0 0 1 0-16.8Z"
        fill="currentColor"
        fillOpacity=".22"
      />
    </svg>
  );
}
