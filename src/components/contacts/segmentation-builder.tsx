"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, X, RefreshCw } from "lucide-react"

export interface FilterRule {
  field: string
  operator: string
  value: string
  join: "AND" | "OR"
}

interface SegmentationBuilderProps {
  onApply: (rules: FilterRule[]) => void
  onClear: () => void
}

export function SegmentationBuilder({ onApply, onClear }: SegmentationBuilderProps) {
  const [rules, setRules] = React.useState<FilterRule[]>([
    { field: "tags", operator: "contains", value: "VIP", join: "AND" }
  ])

  const addRule = () => {
    setRules([...rules, { field: "email", operator: "contains", value: "", join: "AND" }])
  }

  const removeRule = (index: number) => {
    const updated = rules.filter((_, idx) => idx !== index)
    setRules(updated)
  }

  const updateRule = (index: number, key: keyof FilterRule, val: string) => {
    const updated = [...rules]
    updated[index] = { ...updated[index], [key]: val }
    setRules(updated)
  }

  const handleApply = () => {
    onApply(rules)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-md font-semibold text-foreground">Advanced Filters</h3>
        <Button variant="ghost" size="sm" onClick={onClear} className="text-xs text-muted-foreground hover:text-foreground">
          <RefreshCw className="mr-1.5 h-3 w-3" />
          Reset
        </Button>
      </div>
      
      <div className="space-y-3 bg-muted/20 p-3 rounded-lg border">
        {rules.map((rule, index) => (
          <div key={index} className="flex flex-col gap-2 p-2 border rounded-md bg-card shadow-xs">
            {index > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Condition Connector</span>
                <select 
                  className="h-7 rounded-md border border-input bg-background px-2 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={rule.join}
                  onChange={(e) => updateRule(index, "join", e.target.value as "AND" | "OR")}
                >
                  <option value="AND">AND</option>
                  <option value="OR">OR</option>
                </select>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <select 
                className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={rule.field}
                onChange={(e) => updateRule(index, "field", e.target.value)}
              >
                <option value="email">Email</option>
                <option value="firstName">First Name</option>
                <option value="lastName">Last Name</option>
                <option value="tags">Tags</option>
                <option value="status">Status</option>
                <option value="city">City</option>
                <option value="country">Country</option>
              </select>
              
              <select 
                className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={rule.operator}
                onChange={(e) => updateRule(index, "operator", e.target.value)}
              >
                <option value="equals">Equals</option>
                <option value="not_equals">Not Equals</option>
                <option value="contains">Contains</option>
                <option value="starts_with">Starts With</option>
              </select>

              <Input 
                className="h-8 flex-1 text-xs" 
                value={rule.value}
                onChange={(e) => updateRule(index, "value", e.target.value)}
                placeholder="Value"
              />
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground shrink-0 hover:text-destructive"
                onClick={() => removeRule(index)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}

        {rules.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">No filter criteria added yet.</p>
        )}
        
        <Button variant="outline" size="sm" className="mt-1 text-xs w-full py-1 h-8" onClick={addRule}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Criteria
        </Button>
      </div>
      
      <Button className="w-full h-9 text-xs" onClick={handleApply}>
        Apply Segment Rules
      </Button>
    </div>
  )
}
