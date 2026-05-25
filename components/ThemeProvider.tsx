"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes";

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const orig = console.error;
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Encountered a script tag")
    )
      return;
    orig.apply(console, args);
  };
}

export function ThemeProvider({ children, nonce, ...props }: ThemeProviderProps & { nonce?: string }) {
  return <NextThemesProvider nonce={nonce} {...props}>{children}</NextThemesProvider>;
}
