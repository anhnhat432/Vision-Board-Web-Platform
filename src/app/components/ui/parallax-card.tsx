import { cn } from "./utils";

interface ParallaxCardProps extends React.ComponentPropsWithoutRef<"div"> {
  children: React.ReactNode;
  maxTilt?: number;
}

export function ParallaxCard({ children, className, maxTilt, ...props }: ParallaxCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-card border border-app-line bg-app-surface transition-all duration-300",
        className
      )}
      {...props}
    >
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}

export default ParallaxCard;
