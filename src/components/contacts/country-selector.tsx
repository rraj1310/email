"use client"

import * as React from "react"
import { Globe } from "lucide-react"

export const COUNTRIES = [
  "United States",
  "India",
  "United Kingdom",
  "Canada",
  "Australia",
  "Singapore",
  "Germany",
  "France",
  "Japan",
  "United Arab Emirates",
  "Saudi Arabia",
  "Brazil",
  "Mexico",
  "South Africa",
  "Netherlands",
  "Switzerland",
  "Spain",
  "Italy",
  "Ireland",
  "New Zealand",
  "Russia",
  "China",
  "South Korea",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Belgium",
  "Austria",
  "Malaysia",
  "Indonesia",
  "Philippines",
  "Thailand",
  "Vietnam",
  "Turkey"
].sort()

interface CountrySelectorProps {
  value: string
  onChange: (value: string) => void
  id?: string
}

export function CountrySelector({ value, onChange, id }: CountrySelectorProps) {
  return (
    <div className="relative">
      <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer"
      >
        <option value="">Select a country...</option>
        {COUNTRIES.map((country) => (
          <option key={country} value={country}>
            {country}
          </option>
        ))}
        <option value="Other">Other / Not Listed</option>
      </select>
      <div className="absolute right-3 top-3 pointer-events-none border-l-4 border-r-4 border-t-4 border-transparent border-t-muted-foreground h-0 w-0 mt-1.5" />
    </div>
  )
}
