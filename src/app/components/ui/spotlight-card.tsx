import { cn } from "./utils";

interface SpotlightCardProps extends React.ComponentPropsWithoutRef<"div"> {
  children: React.ReactNode;
}

export function SpotlightCard({ children, className, ...props }: SpotlightCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-card border border-app-line bg-app-surface transition-all duration-300 hover:border-app-accent/40 hover:shadow-sm",
        className,
      )}
      {...props}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default SpotlightCard;
