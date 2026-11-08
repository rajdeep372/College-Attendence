"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-white/10" />
    );
  }

  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative p-2 rounded-xl bg-white/90 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-700/60 border border-slate-200/90 dark:border-sky-500/20 dark:hover:border-sky-400/50 text-slate-700 hover:text-sky-600 dark:text-slate-200 dark:hover:text-sky-300 transition-all duration-300 backdrop-blur-md shadow-xs dark:shadow-[0_0_15px_rgba(56,189,248,0.1)] hover:shadow-md dark:hover:shadow-[0_0_20px_rgba(56,189,248,0.25)] cursor-pointer"
      aria-label="Toggle theme"
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-300 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-sky-600 dark:text-sky-400 transition-transform hover:-rotate-12" />
      )}
    </button>
  );
}

