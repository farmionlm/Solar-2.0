"use client";

import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent hover:border-border transition-all flex items-center justify-center"
      title={theme === "dark" ? "Mudar para Tema Claro" : "Mudar para Tema Escuro"}
      aria-label="Alternar tema"
    >
      {theme === "dark" ? (
        <Sun className="w-5 h-5 text-amber-400 hover:rotate-45 transition-transform shrink-0" />
      ) : (
        <Moon className="w-5 h-5 text-slate-700 dark:text-slate-200 hover:-rotate-12 transition-transform shrink-0" />
      )}
    </button>
  );
}
