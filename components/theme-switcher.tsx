"use client";

import { Sun } from "lucide-react";

/**
 * ThemeSwitcher component - Simplified for Ghibli light-theme only
 * Now displays a decorative sun icon to represent the warm, sunny Ghibli aesthetic
 */
const ThemeSwitcher = () => {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-muted/50 px-2 py-1">
      <Sun size={14} className="text-primary" aria-hidden="true" />
      <span className="text-xs font-medium text-muted-foreground">Light Theme</span>
    </div>
  );
};

export { ThemeSwitcher };
