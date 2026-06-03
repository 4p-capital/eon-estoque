"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// Provider de tema (next-themes) com estratégia `class` — dark é opt-in
// por classe `.dark` no <html>, conforme AGENTS.md §5.7.
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
