"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ShieldAlert, Search, Trash2, Mail, Compass, ShieldOff } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SuppressionList } from "@prisma/client"
import { addSuppressedEmail, removeSuppressedEmail } from "@/app/actions/suppression"
import { toast } from "sonner"

interface SuppressionClientProps {
  initialList: SuppressionList[]
  stats: {
    unsubscribed: number
    bounced: number
    complained: number
    total: number
  }
}

export function SuppressionClient({ initialList, stats: initialStats }: SuppressionClientProps) {
  const [list, setList] = React.useState<SuppressionList[]>(initialList)
  const [stats, setStats] = React.useState(initialStats)
  const [search, setSearch] = React.useState("")
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  // Form states
  const [newEmail, setNewEmail] = React.useState("")
  const [newReason, setNewReason] = React.useState("UNSUBSCRIBED")

  // Filter list
  const filteredList = React.useMemo(() => {
    return list.filter(item => 
      item.email.toLowerCase().includes(search.toLowerCase())
    )
  }, [list, search])

  // Handle Add Submit
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail) return

    setIsSaving(true)
    try {
      const result = await addSuppressedEmail(newEmail, newReason)
      if (result.success && result.data) {
        toast.success(`Successfully suppressed ${newEmail}`)
        setList([result.data as SuppressionList, ...list])
        
        // Recalculate stats locally
        const reasonKey = newReason.toLowerCase() as "unsubscribed" | "bounced" | "complained"
        setStats(prev => ({
          ...prev,
          [reasonKey]: prev[reasonKey] + 1,
          total: prev.total + 1
        }))

        // Reset
        setNewEmail("")
        setNewReason("UNSUBSCRIBED")
        setIsAddOpen(false)
      } else {
        toast.error(result.error || "Failed to add email to suppression list.")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to update suppression list.")
    } finally {
      setIsSaving(false)
    }
  }

  // Handle Remove Suppression
  const handleRemove = async (id: string, email: string, reason: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from the suppression list?`)) return

    try {
      const result = await removeSuppressedEmail(id)
      if (result.success) {
        toast.success(`Removed ${email} from suppression list.`)
        setList(list.filter(item => item.id !== id))

        // Recalculate stats locally
        const reasonKey = reason.toLowerCase() as "unsubscribed" | "bounced" | "complained"
        setStats(prev => ({
          ...prev,
          [reasonKey]: Math.max(0, prev[reasonKey] - 1),
          total: Math.max(0, prev.total - 1)
        }))
      } else {
        toast.error(result.error || "Failed to remove entry.")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to delete entry.")
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Suppression List</h2>
          <p className="text-muted-foreground text-sm">
            Maintain spam compliance by blacklisting unsubscribes, bounces, and complaint addresses.
          </p>
        </div>
      </div>

      {/* Grid: 3 Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border shadow-xs bg-gradient-to-b from-card to-card/95 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-indigo-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Unsubscribed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-500">{stats.unsubscribed.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Users who opted out of campaigns</p>
          </CardContent>
        </Card>
        
        <Card className="border shadow-xs bg-gradient-to-b from-card to-card/95 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-red-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Hard Bounces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{stats.bounced.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Undeliverable addresses</p>
          </CardContent>
        </Card>
        
        <Card className="border shadow-xs bg-gradient-to-b from-card to-card/95 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-amber-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Spam Complaints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-500">{stats.complained.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Flagged by email client receivers</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Add Manual Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Search suppressed emails..." 
            className="pl-9 w-full h-10 text-sm shadow-xs" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        {/* Add Suppressed Dialog Trigger */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={<Button className="w-full sm:w-auto h-10 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium" />}>
            <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
            Add Email Manually
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <form onSubmit={handleAdd}>
              <DialogHeader className="pb-3 border-b mb-4">
                <DialogTitle className="text-lg font-bold">Suppress Email Address</DialogTitle>
                <DialogDescription className="text-xs">
                  Manually exclude an email from all campaigns.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="suppressEmail" className="text-xs font-semibold">Email Address *</Label>
                  <Input 
                    id="suppressEmail" 
                    type="email" 
                    placeholder="user@blockdomain.com" 
                    value={newEmail} 
                    onChange={(e) => setNewEmail(e.target.value)} 
                    required 
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="suppressReason" className="text-xs font-semibold">Reason Category</Label>
                  <select 
                    id="suppressReason" 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                  >
                    <option value="UNSUBSCRIBED">Unsubscribed</option>
                    <option value="BOUNCED">Hard Bounce</option>
                    <option value="COMPLAINED">Spam Complaint</option>
                  </select>
                </div>
              </div>

              <DialogFooter className="mt-6 pt-4 border-t">
                <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)} disabled={isSaving} className="text-xs h-9">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="text-xs h-9 bg-red-600 hover:bg-red-700 text-white">
                  {isSaving ? "Adding..." : "Confirm Suppression"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Suppression list table layout */}
      <div className="border rounded-lg bg-card overflow-hidden shadow-xs">
        
        {/* DESKTOP TABLE */}
        <div className="hidden md:block">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-semibold text-xs text-muted-foreground">Email Address</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Reason</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Scope</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Date Blocked</TableHead>
                <TableHead className="text-right font-semibold text-xs text-muted-foreground pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredList.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/10 transition-colors">
                  <TableCell className="font-semibold text-foreground py-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{item.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] uppercase font-bold ${
                      item.reason === "UNSUBSCRIBED" ? "border-indigo-500 text-indigo-500 bg-indigo-500/5" :
                      item.reason === "BOUNCED" || item.reason === "HARD_BOUNCE" ? "border-red-500 text-red-500 bg-red-500/5" :
                      "border-amber-500 text-amber-500 bg-amber-500/5"
                    }`}>
                      {item.reason}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground uppercase tracking-wider">{item.scope}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right py-3 pr-6">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs h-8 text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemove(item.id, item.email, item.reason)}
                    >
                      <ShieldOff className="mr-1 h-3.5 w-3.5" />
                      Unblock
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {filteredList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-sm">
                    No blacklisted email addresses found matching search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* MOBILE RESPONSIVE CARDS */}
        <div className="block md:hidden divide-y">
          {filteredList.map((item) => (
            <div key={item.id} className="p-4 flex flex-col gap-2 hover:bg-muted/10 transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-foreground truncate max-w-[70%]">{item.email}</span>
                <Badge variant="outline" className={`text-[9px] uppercase font-bold ${
                  item.reason === "UNSUBSCRIBED" ? "border-indigo-500 text-indigo-500" :
                  item.reason === "BOUNCED" || item.reason === "HARD_BOUNCE" ? "border-red-500 text-red-500" :
                  "border-amber-500 text-amber-500"
                }`}>
                  {item.reason}
                </Badge>
              </div>
              <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1">
                <span>Blocked: {new Date(item.createdAt).toLocaleDateString()}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-[10px] h-7 text-destructive hover:bg-destructive/10 px-2 py-0"
                  onClick={() => handleRemove(item.id, item.email, item.reason)}
                >
                  Unblock
                </Button>
              </div>
            </div>
          ))}

          {filteredList.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No blacklisted addresses.
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
