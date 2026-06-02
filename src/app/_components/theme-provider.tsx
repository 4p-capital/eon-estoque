"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// Provider de tema (next-themes) com estratégia `class` — dark é opt-in
// por classe `.dark` no <html>, conforme DESIGN_SYSTEM.md §6.
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
