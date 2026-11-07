"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-xl bg-slate-200/50 dark:bg-slate-800/40 border border-slate-300 dark:border-white/10" />
    );
  }

  const currentTheme = resolvedTheme || theme;
  const isDark = currentTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative z-10 p-2.5 rounded-xl bg-white/80 hover:bg-white dark:bg-slate-900/80 dark:hover:bg-slate-800 border border-sky-400/30 text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-300 transition-all duration-300 backdrop-blur-md shadow-sm dark:shadow-[0_0_15px_rgba(56,189,248,0.15)] hover:shadow-md cursor-pointer flex items-center justify-center"
      aria-label="Toggle dark/light mode"
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-sky-600 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
}
