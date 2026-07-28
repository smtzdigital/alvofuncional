import { Dumbbell } from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";

export function Logo({ size = "lg" }: { size?: "sm" | "md" | "lg" }) {
  const { settings } = useAppSettings();
  const sizes = { sm: "text-lg", md: "text-xl", lg: "text-3xl" };
  const iconSize = { sm: 18, md: 22, lg: 32 };
  const boxSize = { sm: "h-8 w-8", md: "h-9 w-9", lg: "h-12 w-12" };
  const logoHeight = { sm: "h-6", md: "h-8", lg: "h-10" };

  const name = settings.app_name || "Alvo Funcional";

  // Full logo image replaces the icon + wordmark when available
  if (settings.logo_url) {
    return (
      <div className="flex items-center">
        <img
          src={settings.logo_url}
          alt={name}
          className={`${logoHeight[size]} w-auto max-w-[180px] object-contain`}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 font-bold">
      <div className={`flex ${boxSize[size]} items-center justify-center rounded-lg overflow-hidden`}>
        {settings.logo_icon_url ? (
          <img src={settings.logo_icon_url} alt={name} className="h-full w-full object-cover" />
        ) : (
          <Dumbbell size={iconSize[size]} className="text-primary-foreground" strokeWidth={2.5} />
        )}
      </div>
      <span className={`${sizes[size]} tracking-tight uppercase`}>{name}</span>
    </div>
  );
}

