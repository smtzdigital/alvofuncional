import { Dumbbell } from "lucide-react";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "text-lg", md: "text-xl", lg: "text-3xl" };
  const iconSize = { sm: 18, md: 22, lg: 32 };
  return (
    <div className="flex items-center gap-2 font-bold">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
        <Dumbbell size={iconSize[size]} className="text-primary-foreground" strokeWidth={2.5} />
      </div>
      <span className={`${sizes[size]} tracking-tight`}>
        FORGE<span className="text-primary">FIT</span>
      </span>
    </div>
  );
}
