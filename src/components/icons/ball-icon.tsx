import { cn } from "@/lib/utils";

/** Bola de futebol no estilo do Lucide (24×24, traço, currentColor). O Lucide não traz uma. */
export function BallIcon({
  className,
  strokeWidth = 1.75,
  ...props
}: Omit<React.ComponentProps<"svg">, "strokeWidth"> & { strokeWidth?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn("size-6", className)}
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8.8 15.04 11.01 13.88 14.59 10.12 14.59 8.96 11.01Z" />
      <path d="M12 8.8V2M15.04 11.01 21.51 8.91M13.88 14.59 17.88 20.09M10.12 14.59 6.12 20.09M8.96 11.01 2.49 8.91" />
    </svg>
  );
}
