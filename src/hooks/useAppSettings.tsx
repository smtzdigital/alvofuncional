import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AppSettings {
  app_name: string;
  app_short_name: string;
  app_description: string;
  primary_color: string;
  primary_glow: string;
  accent_color: string;
  background_color: string;
  logo_url: string | null;
  logo_icon_url: string | null;
  favicon_url: string | null;
  pwa_icon_192_url: string | null;
  pwa_icon_512_url: string | null;
  pwa_theme_color: string;
  pwa_background_color: string;
  coming_soon_enabled: boolean;
}

const DEFAULTS: AppSettings = {
  app_name: "ForgeFit",
  app_short_name: "ForgeFit",
  app_description: "Plataforma completa de academia: treinos, dieta, metas, ranking e gestão.",
  primary_color: "oklch(0.85 0.22 130)",
  primary_glow: "oklch(0.92 0.20 135)",
  accent_color: "oklch(0.70 0.20 30)",
  background_color: "oklch(0.18 0.02 260)",
  logo_url: null,
  logo_icon_url: null,
  favicon_url: null,
  pwa_icon_192_url: null,
  pwa_icon_512_url: null,
  pwa_theme_color: "#0b0b0f",
  pwa_background_color: "#0b0b0f",
  coming_soon_enabled: false,
};

interface Ctx {
  settings: AppSettings;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AppSettingsContext = createContext<Ctx>({ settings: DEFAULTS, loading: true, refresh: async () => {} });

function applyToDOM(s: AppSettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--primary", s.primary_color);
  root.style.setProperty("--primary-glow", s.primary_glow);
  root.style.setProperty("--accent", s.accent_color);
  root.style.setProperty("--ring", s.primary_color);
  root.style.setProperty("--sidebar-primary", s.primary_color);
  root.style.setProperty("--sidebar-ring", s.primary_color);

  // Title
  document.title = `${s.app_name} — Plataforma da Academia`;

  // Favicon
  if (s.favicon_url) {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = s.favicon_url;
  }

  // Theme color
  let theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!theme) {
    theme = document.createElement("meta");
    theme.name = "theme-color";
    document.head.appendChild(theme);
  }
  theme.content = s.pwa_theme_color;

  // Dynamic manifest
  const manifest = {
    name: s.app_name,
    short_name: s.app_short_name,
    description: s.app_description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: s.pwa_background_color,
    theme_color: s.pwa_theme_color,
    icons: [
      { src: s.pwa_icon_192_url || "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
      { src: s.pwa_icon_512_url || "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  };
  const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
  const url = URL.createObjectURL(blob);
  let mlink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!mlink) {
    mlink = document.createElement("link");
    mlink.rel = "manifest";
    document.head.appendChild(mlink);
  }
  mlink.href = url;
}

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase.from("app_settings").select("*").eq("id", true).maybeSingle();
    const merged = { ...DEFAULTS, ...(data ?? {}) } as AppSettings;
    setSettings(merged);
    applyToDOM(merged);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <AppSettingsContext.Provider value={{ settings, loading, refresh: load }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  return useContext(AppSettingsContext);
}
