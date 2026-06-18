"use client"

import * as React from "react"
import { Palette, Sparkles, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

interface ColorTheme {
  id: string
  name: string
  icon: string
  colors: {
    light: {
      primary: string
      primaryForeground: string
      ring: string
      sidebarPrimary: string
      sidebarPrimaryForeground: string
      sidebarRing: string
    }
    dark: {
      primary: string
      primaryForeground: string
      ring: string
      sidebarPrimary: string
      sidebarPrimaryForeground: string
      sidebarRing: string
    }
  }
}

const THEMES: ColorTheme[] = [
  {
    id: "orchid",
    name: "Royal Orchid",
    icon: "💜",
    colors: {
      light: {
        primary: "oklch(0.53 0.22 281)",
        primaryForeground: "oklch(0.99 0.005 281)",
        ring: "oklch(0.53 0.22 281)",
        sidebarPrimary: "oklch(0.53 0.22 281)",
        sidebarPrimaryForeground: "oklch(0.99 0.005 281)",
        sidebarRing: "oklch(0.53 0.22 281)",
      },
      dark: {
        primary: "oklch(0.68 0.19 281)",
        primaryForeground: "oklch(0.1 0.03 281)",
        ring: "oklch(0.68 0.19 281)",
        sidebarPrimary: "oklch(0.68 0.19 281)",
        sidebarPrimaryForeground: "oklch(0.1 0.03 281)",
        sidebarRing: "oklch(0.68 0.19 281)",
      },
    },
  },
  {
    id: "emerald",
    name: "Emerald Grace",
    icon: "💚",
    colors: {
      light: {
        primary: "oklch(0.62 0.17 150)",
        primaryForeground: "oklch(0.99 0.005 150)",
        ring: "oklch(0.62 0.17 150)",
        sidebarPrimary: "oklch(0.62 0.17 150)",
        sidebarPrimaryForeground: "oklch(0.99 0.005 150)",
        sidebarRing: "oklch(0.62 0.17 150)",
      },
      dark: {
        primary: "oklch(0.72 0.16 150)",
        primaryForeground: "oklch(0.08 0.03 150)",
        ring: "oklch(0.72 0.16 150)",
        sidebarPrimary: "oklch(0.72 0.16 150)",
        sidebarPrimaryForeground: "oklch(0.08 0.03 150)",
        sidebarRing: "oklch(0.72 0.16 150)",
      },
    },
  },
  {
    id: "sunset",
    name: "Amber Sunset",
    icon: "🧡",
    colors: {
      light: {
        primary: "oklch(0.68 0.19 65)",
        primaryForeground: "oklch(0.99 0.005 65)",
        ring: "oklch(0.68 0.19 65)",
        sidebarPrimary: "oklch(0.68 0.19 65)",
        sidebarPrimaryForeground: "oklch(0.99 0.005 65)",
        sidebarRing: "oklch(0.68 0.19 65)",
      },
      dark: {
        primary: "oklch(0.76 0.15 65)",
        primaryForeground: "oklch(0.08 0.03 65)",
        ring: "oklch(0.76 0.15 65)",
        sidebarPrimary: "oklch(0.76 0.15 65)",
        sidebarPrimaryForeground: "oklch(0.08 0.03 65)",
        sidebarRing: "oklch(0.76 0.15 65)",
      },
    },
  },
  {
    id: "rose",
    name: "Velvet Rose",
    icon: "💖",
    colors: {
      light: {
        primary: "oklch(0.58 0.22 15)",
        primaryForeground: "oklch(0.99 0.005 15)",
        ring: "oklch(0.58 0.22 15)",
        sidebarPrimary: "oklch(0.58 0.22 15)",
        sidebarPrimaryForeground: "oklch(0.99 0.005 15)",
        sidebarRing: "oklch(0.58 0.22 15)",
      },
      dark: {
        primary: "oklch(0.68 0.19 15)",
        primaryForeground: "oklch(0.08 0.03 15)",
        ring: "oklch(0.68 0.19 15)",
        sidebarPrimary: "oklch(0.68 0.19 15)",
        sidebarPrimaryForeground: "oklch(0.08 0.03 15)",
        sidebarRing: "oklch(0.68 0.19 15)",
      },
    },
  },
  {
    id: "aurora",
    name: "Cyber Aurora",
    icon: "💙",
    colors: {
      light: {
        primary: "oklch(0.60 0.18 200)",
        primaryForeground: "oklch(0.99 0.005 200)",
        ring: "oklch(0.60 0.18 200)",
        sidebarPrimary: "oklch(0.60 0.18 200)",
        sidebarPrimaryForeground: "oklch(0.99 0.005 200)",
        sidebarRing: "oklch(0.60 0.18 200)",
      },
      dark: {
        primary: "oklch(0.70 0.15 200)",
        primaryForeground: "oklch(0.08 0.03 200)",
        ring: "oklch(0.70 0.15 200)",
        sidebarPrimary: "oklch(0.70 0.15 200)",
        sidebarPrimaryForeground: "oklch(0.08 0.03 200)",
        sidebarRing: "oklch(0.70 0.15 200)",
      },
    },
  },
]

export function PremiumWorkspaceControls() {
  const [activeTheme, setActiveTheme] = React.useState("orchid")

  // Initialize theme from localStorage
  React.useEffect(() => {
    const savedTheme = localStorage.getItem("dashboard_color_theme")
    if (savedTheme) {
      applyTheme(savedTheme)
    }
  }, [])

  const applyTheme = (themeId: string) => {
    const theme = THEMES.find((t) => t.id === themeId)
    if (!theme) return

    setActiveTheme(themeId)
    localStorage.setItem("dashboard_color_theme", themeId)

    const root = document.documentElement
    
    // Light variables
    Object.entries(theme.colors.light).forEach(([key, val]) => {
      const cssKey = `--${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`
      root.style.setProperty(cssKey, val)
    })
    
    // Set up style tag override for dark mode rules
    let customStyleEl = document.getElementById("custom-theme-style")
    if (!customStyleEl) {
      customStyleEl = document.createElement("style")
      customStyleEl.id = "custom-theme-style"
      document.head.appendChild(customStyleEl)
    }

    const darkProps = Object.entries(theme.colors.dark)
      .map(([key, val]) => {
        const cssKey = `--${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`
        return `${cssKey}: ${val} !important;`
      })
      .join("\n")

    const lightProps = Object.entries(theme.colors.light)
      .map(([key, val]) => {
        const cssKey = `--${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`
        return `${cssKey}: ${val} !important;`
      })
      .join("\n")

    customStyleEl.innerHTML = `
      :root {
        ${lightProps}
      }
      .dark {
        ${darkProps}
      }
    `
  }

  return (
    <div className="flex items-center gap-2">
      {/* Dynamic Theme Color Picker */}
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-indigo-200/50 hover:bg-indigo-50 dark:border-indigo-900/40 dark:hover:bg-slate-900 shadow-xs cursor-pointer" />}>
          <Palette className="h-[1.1rem] w-[1.1rem] text-primary" />
          <span className="sr-only">Choose Color Theme</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-card/90 backdrop-blur-md border shadow-lg rounded-xl">
          <DropdownMenuLabel className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-amber-500" />
            Portal Theme Color
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {THEMES.map((theme) => (
            <DropdownMenuItem
              key={theme.id}
              onClick={() => applyTheme(theme.id)}
              className="flex items-center justify-between py-2 px-3 text-xs rounded-lg cursor-pointer focus:bg-primary/10"
            >
              <span className="flex items-center gap-2 font-medium">
                <span>{theme.icon}</span>
                <span>{theme.name}</span>
              </span>
              {activeTheme === theme.id && (
                <Check className="h-3.5 w-3.5 text-primary stroke-[3]" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
