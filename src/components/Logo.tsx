import { Dumbbell } from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const { settings } = useAppSettings();
  const sizes = { sm: "text-lg", md: "text-xl", lg: "text-3xl" };
  const iconSize = { sm: 18, md: 22, lg: 32 };
  const boxSize = { sm: "h-8 w-8", md: "h-9 w-9", lg: "h-12 w-12" };

  // Split app name to colorize last word/half
  const name = settings.app_name || "Alvo Funcional";
  const split = Math.ceil(name.length / 2);
  const part1 = name.slice(0, split);
  const part2 = name.slice(split);

  return (
    <div className="flex items-center gap-2 font-bold">
      <div
        className={`flex ${boxSize[size]} items-center justify-center rounded-lg bg-gradient-primary shadow-glow overflow-hidden`}
      >
        {settings.logo_icon_url ? (
          <img src={settings.logo_icon_url} alt={name} className="h-full w-full object-cover" />
        ) : (
          <Dumbbell size={iconSize[size]} className="text-primary-foreground" strokeWidth={2.5} />
        )}
      </div>
      <span className={`${sizes[size]} tracking-tight uppercase`}>
        {part1}
        <span className="text-primary">{part2}</span>
      </span>
    </div>
  );
}
