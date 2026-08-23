import type { ChatTheme } from "@/lib/types";

export const CHAT_THEME_PRESETS: { id: ChatTheme; label: string; bg: string }[] = [
  { id: "default", label: "Classic", bg: "#E5DDD5" },
  { id: "teal", label: "Teal", bg: "#DCF0EA" },
  { id: "sky", label: "Sky", bg: "#DCEEFB" },
  { id: "sand", label: "Sand", bg: "#F0E4D0" },
  { id: "mint", label: "Mint", bg: "#E3F5E1" },
];

export function chatThemeBackground(theme: ChatTheme | null | undefined) {
  return CHAT_THEME_PRESETS.find((t) => t.id === theme)?.bg ?? CHAT_THEME_PRESETS[0].bg;
}
