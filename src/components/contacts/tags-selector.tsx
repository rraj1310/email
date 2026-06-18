"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { X, Plus, Sparkles } from "lucide-react"

// Curated harmonious colors for tags based on tag name hash
export function getTagColorClass(name: string) {
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const colors = [
    "bg-red-500/10 text-red-600 border-red-200/50 dark:bg-red-500/20 dark:text-red-300 dark:border-red-800/40",
    "bg-orange-500/10 text-orange-600 border-orange-200/50 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-800/40",
    "bg-amber-500/10 text-amber-600 border-amber-200/50 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-800/40",
    "bg-emerald-500/10 text-emerald-600 border-emerald-200/50 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-800/40",
    "bg-teal-500/10 text-teal-600 border-teal-200/50 dark:bg-teal-500/20 dark:text-teal-300 dark:border-teal-800/40",
    "bg-blue-500/10 text-blue-600 border-blue-200/50 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-800/40",
    "bg-indigo-500/10 text-indigo-600 border-indigo-200/50 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-800/40",
    "bg-purple-500/10 text-purple-600 border-purple-200/50 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-800/40",
    "bg-pink-500/10 text-pink-600 border-pink-200/50 dark:bg-pink-500/20 dark:text-pink-300 dark:border-pink-800/40",
    "bg-rose-500/10 text-rose-600 border-rose-200/50 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-800/40",
  ]
  return colors[hash % colors.length]
}

const PRESET_SUGGESTIONS = [
  "VIP",
  "Leads",
  "Partner",
  "Customer",
  "Prospect",
  "Active",
  "Inactive",
  "Newsletter",
  "Event-Attendee"
]

interface TagsSelectorProps {
  selectedTags: string[]
  onChange: (tags: string[]) => void
  availableTags?: string[]
}

export function TagsSelector({ selectedTags, onChange, availableTags = [] }: TagsSelectorProps) {
  const [inputValue, setInputValue] = React.useState("")
  const [isOpen, setIsOpen] = React.useState(false)

  // Combined suggestions: presets + dynamic tags from database
  const allSuggestions = React.useMemo(() => {
    const combined = Array.from(new Set([...PRESET_SUGGESTIONS, ...availableTags]))
    return combined.filter(tag => !selectedTags.includes(tag))
  }, [selectedTags, availableTags])

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim()
    if (trimmed && !selectedTags.includes(trimmed)) {
      onChange([...selectedTags, trimmed])
    }
    setInputValue("")
  }

  const handleRemoveTag = (tag: string) => {
    onChange(selectedTags.filter(t => t !== tag))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddTag(inputValue)
    }
  }

  return (
    <div className="space-y-2.5">
      {/* Selected Tags list */}
      <div className="flex flex-wrap gap-1.5 p-2 min-h-[42px] w-full rounded-md border border-input bg-background/50 focus-within:ring-1 focus-within:ring-ring focus-within:border-ring">
        {selectedTags.map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className={`text-xs font-semibold py-0.5 px-2 flex items-center gap-1 border transition-all duration-200 hover:scale-[1.02] shadow-xs ${getTagColorClass(tag)}`}
          >
            {tag}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className="text-foreground/60 hover:text-foreground focus:outline-none transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {selectedTags.length === 0 && (
          <span className="text-muted-foreground text-xs leading-6 pl-1 select-none">No tags selected. Add tags below.</span>
        )}
      </div>

      {/* Input row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            placeholder="Type custom tag... (Press Enter)"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
            onKeyDown={handleKeyDown}
            className="text-xs h-9 w-full shadow-xs"
          />
          {/* Autocomplete Dropdown List */}
          {isOpen && allSuggestions.length > 0 && inputValue.trim() && (
            <div className="absolute left-0 right-0 z-50 mt-1 max-h-40 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md">
              <div className="p-1">
                {allSuggestions
                  .filter(tag => tag.toLowerCase().includes(inputValue.toLowerCase()))
                  .map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onMouseDown={() => handleAddTag(tag)}
                      className="w-full text-left rounded-sm px-2 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground outline-none cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
        <Button
          type="button"
          onClick={() => handleAddTag(inputValue)}
          className="text-xs h-9 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900/50 dark:text-indigo-400 font-medium"
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add
        </Button>
      </div>

      {/* Quick click options suggestion pills */}
      {allSuggestions.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-indigo-500 fill-indigo-500/10" /> Suggested Quick-Add
          </span>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {allSuggestions.slice(0, 8).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleAddTag(tag)}
                className={`text-[10px] font-semibold py-0.5 px-2 rounded-full border bg-muted/40 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/20 border-slate-200 dark:border-slate-800 text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800/40 transition-all cursor-pointer`}
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
