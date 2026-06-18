"use client"

import * as React from "react"
import Link from "next/link"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { SegmentationBuilder, FilterRule } from "@/components/contacts/segmentation-builder"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Plus, Search, Filter, Download, Upload, User, Trash2, Mail, ExternalLink, Sparkles, Check } from "lucide-react"
import { Contact, Tag } from "@prisma/client"
import { createContact, deleteContact, getTags } from "@/app/actions/contacts"
import { generateSegmentRules } from "@/app/actions/copilot"
import { toast } from "sonner"
import Papa from "papaparse"
import { TagsSelector, getTagColorClass } from "@/components/contacts/tags-selector"
import { CountrySelector } from "@/components/contacts/country-selector"

type ContactWithTags = Contact & { tags: Tag[] }

interface ContactsClientProps {
  initialContacts: unknown[]
}

export function ContactsClient({ initialContacts }: ContactsClientProps) {
  const [contacts, setContacts] = React.useState<ContactWithTags[]>(initialContacts as ContactWithTags[])
  const [search, setSearch] = React.useState("")
  const [activeSegmentRules, setActiveSegmentRules] = React.useState<FilterRule[]>([])
  
  // Dialog Open States
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  // Form Fields for Add Contact
  const [newEmail, setNewEmail] = React.useState("")
  const [newFirstName, setNewFirstName] = React.useState("")
  const [newLastName, setNewLastName] = React.useState("")
  const [newPhone, setNewPhone] = React.useState("")
  const [newCity, setNewCity] = React.useState("")
  const [newCountry, setNewCountry] = React.useState("")
  const [newStatus, setNewStatus] = React.useState("ACTIVE")
  const [newTags, setNewTags] = React.useState<string[]>([])
  const [newBirthday, setNewBirthday] = React.useState("")
  const [availableTags, setAvailableTags] = React.useState<string[]>([])

  React.useEffect(() => {
    async function loadTags() {
      const res = await getTags()
      if (res.success && res.data) {
        setAvailableTags(res.data.map(t => t.name))
      }
    }
    loadTags()
  }, [])

  // Filter contacts by query + advanced segments
  const filteredContacts = React.useMemo(() => {
    return contacts.filter(contact => {
      // 1. Text Search Filter
      const emailMatch = contact.email.toLowerCase().includes(search.toLowerCase())
      const nameMatch = `${contact.firstName || ""} ${contact.lastName || ""}`
        .toLowerCase()
        .includes(search.toLowerCase())
      
      const matchSearch = search.trim() === "" || emailMatch || nameMatch

      if (!matchSearch) return false

      // 2. Advanced Segmentation Rules Filter
      if (activeSegmentRules.length === 0) return true

      // Evaluate rules
      let segmentMatch = true // If AND, starts as true. If OR, starts as false.
      
      for (let i = 0; i < activeSegmentRules.length; i++) {
        const rule = activeSegmentRules[i]
        let ruleResult = false

        // Fetch property value
        let propVal = ""
        if (rule.field === "tags") {
          propVal = contact.tags.map(t => t.name).join(", ")
        } else {
          const rawVal = contact[rule.field as keyof Contact]
          propVal = rawVal ? String(rawVal) : ""
        }

        const ruleCompareVal = rule.value.toLowerCase()
        const targetVal = propVal.toLowerCase()

        if (rule.operator === "equals") {
          ruleResult = targetVal === ruleCompareVal
        } else if (rule.operator === "not_equals") {
          ruleResult = targetVal !== ruleCompareVal
        } else if (rule.operator === "contains") {
          ruleResult = targetVal.includes(ruleCompareVal)
        } else if (rule.operator === "starts_with") {
          ruleResult = targetVal.startsWith(ruleCompareVal)
        }

        if (i === 0) {
          segmentMatch = ruleResult
        } else {
          if (rule.join === "OR") {
            segmentMatch = segmentMatch || ruleResult
          } else {
            segmentMatch = segmentMatch && ruleResult
          }
        }
      }

      return segmentMatch
    })
  }, [contacts, search, activeSegmentRules])

  // Handle Add Contact Submit
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail) {
      toast.error("Email is required.")
      return
    }

    setIsSaving(true)
    try {
      const result = await createContact({
        email: newEmail,
        firstName: newFirstName,
        lastName: newLastName,
        phone: newPhone,
        city: newCity,
        country: newCountry,
        birthday: newBirthday || null,
        status: newStatus,
        tags: newTags
      })

      if (result.success && result.data) {
        toast.success("Contact created successfully!")
        setContacts([result.data as ContactWithTags, ...contacts])
        
        // Reset fields
        setNewEmail("")
        setNewFirstName("")
        setNewLastName("")
        setNewPhone("")
        setNewCity("")
        setNewCountry("")
        setNewStatus("ACTIVE")
        setNewTags([])
        setNewBirthday("")
        setIsAddOpen(false)
      } else {
        toast.error(result.error || "Failed to create contact")
      }
    } catch (err) {
      console.error(err)
      toast.error("An error occurred while saving the contact.")
    } finally {
      setIsSaving(false)
    }
  }

  // Handle Delete Contact
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return

    try {
      const result = await deleteContact(id)
      if (result.success) {
        toast.success("Contact deleted successfully.")
        setContacts(contacts.filter(c => c.id !== id))
      } else {
        toast.error(result.error || "Failed to delete contact.")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to delete contact.")
    }
  }

  // Handle Export CSV
  const handleExport = () => {
    if (filteredContacts.length === 0) {
      toast.error("No contacts available to export.")
      return
    }

    const exportData = filteredContacts.map(c => ({
      Email: c.email,
      FirstName: c.firstName || "",
      LastName: c.lastName || "",
      Phone: c.phone || "",
      City: c.city || "",
      Country: c.country || "",
      Status: c.status,
      Tags: c.tags.map(t => t.name).join(", "),
      CreatedAt: new Date(c.createdAt).toLocaleDateString()
    }))

    const csv = Papa.unparse(exportData)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `contacts_export_${Date.now()}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Successfully exported ${filteredContacts.length} contacts!`)
  }

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email)
    toast.success("Copied email to clipboard")
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Contacts</h2>
          <p className="text-muted-foreground text-sm">
            Manage your subscribers, organize tags, and build custom filters.
          </p>
        </div>
        
        {/* Top Control Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.location.href = "/contacts/import"} className="h-9 text-xs">
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Import CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="h-9 text-xs">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export List
          </Button>
          
          {/* Add Contact Modal Dialog */}
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger render={<Button size="sm" className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium" />}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Contact
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <form onSubmit={handleAddContact}>
                <DialogHeader className="pb-3 border-b mb-4">
                  <DialogTitle className="text-lg font-bold">Add Contact</DialogTitle>
                  <DialogDescription className="text-xs">
                    Create a new contact record manually. Required fields are marked with *.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                  <div className="grid gap-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold">Email Address *</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="alex@example.com" 
                      value={newEmail} 
                      onChange={(e) => setNewEmail(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="firstName" className="text-xs font-semibold">First Name</Label>
                      <Input 
                        id="firstName" 
                        placeholder="Alex" 
                        value={newFirstName} 
                        onChange={(e) => setNewFirstName(e.target.value)} 
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="lastName" className="text-xs font-semibold">Last Name</Label>
                      <Input 
                        id="lastName" 
                        placeholder="Smith" 
                        value={newLastName} 
                        onChange={(e) => setNewLastName(e.target.value)} 
                      />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="phone" className="text-xs font-semibold">Phone Number</Label>
                    <Input 
                      id="phone" 
                      placeholder="+1 (555) 019-2834" 
                      value={newPhone} 
                      onChange={(e) => setNewPhone(e.target.value)} 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="city" className="text-xs font-semibold">City</Label>
                      <Input 
                        id="city" 
                        placeholder="San Francisco" 
                        value={newCity} 
                        onChange={(e) => setNewCity(e.target.value)} 
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="country" className="text-xs font-semibold">Country</Label>
                      <CountrySelector 
                        id="country" 
                        value={newCountry} 
                        onChange={setNewCountry} 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="birthday" className="text-xs font-semibold">Birthday</Label>
                      <Input 
                        id="birthday" 
                        type="date"
                        value={newBirthday} 
                        onChange={(e) => setNewBirthday(e.target.value)} 
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="status" className="text-xs font-semibold">Status</Label>
                      <select 
                        id="status" 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="UNSUBSCRIBED">Unsubscribed</option>
                        <option value="BOUNCED">Bounced</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold">Contact Tags</Label>
                    <TagsSelector 
                      selectedTags={newTags} 
                      onChange={setNewTags} 
                      availableTags={availableTags} 
                    />
                  </div>
                </div>

                <DialogFooter className="mt-6 pt-4 border-t">
                  <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)} disabled={isSaving} className="text-xs h-9">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving} className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white">
                    {isSaving ? "Saving..." : "Add Contact"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters Drawer Trigger */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        {/* Normal Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search name or email..."
            className="pl-9 w-full h-10 text-xs shadow-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* AI Filter Generator */}
        <div className="relative w-full md:flex-1">
          <Sparkles className="absolute left-3 top-3 h-4 w-4 text-blue-500 fill-blue-500/10" />
          <Input
            type="text"
            placeholder="Ask AI to filter segment... (e.g. VIP subscribers, Inactive users)"
            className="pl-9 pr-24 w-full h-10 text-xs shadow-xs border-blue-200 focus-visible:ring-blue-500 text-foreground"
            onKeyDown={async (e) => {
              if (e.key === "Enter") {
                const query = e.currentTarget.value.trim()
                if (!query) return
                
                const promise = new Promise(async (resolve, reject) => {
                  try {
                    const res = await generateSegmentRules(query) as any
                    if (res.success && res.data) {
                      setActiveSegmentRules(res.data as any)
                      resolve(res.data)
                    } else {
                      reject((res as any).error || "Failed to generate rules")
                    }
                  } catch (err) {
                    reject(err)
                  }
                })
                
                toast.promise(promise, {
                  loading: "AI is compiling filter rules...",
                  success: (data: any) => `Applied ${data.length} filter rules!`,
                  error: (err) => `AI segment generation failed: ${err}`
                })
              }
            }}
          />
          <div className="absolute right-2 top-2 text-[9px] text-muted-foreground bg-muted border px-1.5 py-0.5 rounded font-mono select-none">
            Press Enter
          </div>
        </div>
        
        {/* Sheet Filter Drawer */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger render={<Button variant="outline" className="w-full md:w-auto h-10 text-xs shrink-0" />}>
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Segment Filters
            {activeSegmentRules.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400">
                {activeSegmentRules.length}
              </Badge>
            )}
          </SheetTrigger>
          <SheetContent className="sm:max-w-md">
            <SheetHeader className="pb-4 border-b">
              <SheetTitle>Segmentation Builder</SheetTitle>
              <SheetDescription className="text-xs">
                Build advanced filter rules using AND / OR constraints.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <SegmentationBuilder 
                onApply={(rules) => {
                  setActiveSegmentRules(rules)
                  setIsSheetOpen(false)
                  toast.success(`Applied ${rules.length} segment rules`)
                }}
                onClear={() => {
                  setActiveSegmentRules([])
                  setIsSheetOpen(false)
                  toast.success("Filters cleared")
                }}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Grid Display: Responsive Adaptability */}
      <div className="border rounded-lg bg-card overflow-hidden shadow-xs">
        
        {/* DESKTOP TABLE VIEW (Visible on MD and larger viewports) */}
        <div className="hidden md:block">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-semibold text-xs text-muted-foreground">Name</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Email</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Status</TableHead>
                <TableHead className="font-semibold text-xs text-muted-foreground">Tags</TableHead>
                <TableHead className="text-right font-semibold text-xs text-muted-foreground pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.map((contact) => (
                <TableRow key={contact.id} className="hover:bg-muted/10 transition-colors">
                  <TableCell className="font-semibold text-foreground py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                        {(contact.firstName?.[0] || contact.email[0]).toUpperCase()}
                      </div>
                      <span>
                        {[contact.firstName, contact.lastName].filter(Boolean).join(" ") || "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{contact.email}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={contact.status === "ACTIVE" ? "default" : "secondary"}
                      className={`text-[10px] font-bold ${
                        contact.status === "ACTIVE" 
                          ? "bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20" 
                          : "bg-amber-500/10 text-amber-500 dark:bg-amber-500/20"
                      }`}
                    >
                      {contact.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.map((tag: Tag) => (
                        <Badge key={tag.id} variant="outline" className={`text-[10px] font-semibold py-0.5 px-1.5 border transition-all duration-200 hover:scale-[1.02] shadow-xs ${getTagColorClass(tag.name)}`}>
                          {tag.name}
                        </Badge>
                      ))}
                      {contact.tags.length === 0 && <span className="text-muted-foreground text-xs">—</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right py-3 pr-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" />}>
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel className="text-[11px] text-muted-foreground uppercase">Options</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleCopyEmail(contact.email)} className="text-xs">
                          <Mail className="mr-1.5 h-3.5 w-3.5" /> Copy Email
                        </DropdownMenuItem>
                        <Link href={`/contacts/${contact.id}`} passHref>
                          <DropdownMenuItem className="text-xs">
                            <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> View Details
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-xs text-destructive hover:bg-destructive/10" 
                          onClick={() => handleDelete(contact.id)}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete Contact
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              
              {filteredContacts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-sm">
                    No contacts match search or filter segment rules.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* MOBILE RESPONSIVE LIST VIEW (Visible on mobile/tablet viewports) */}
        <div className="block md:hidden divide-y">
          {filteredContacts.map((contact) => (
            <div key={contact.id} className="p-4 flex flex-col gap-3 hover:bg-muted/10 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                    {(contact.firstName?.[0] || contact.email[0]).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground">
                      {[contact.firstName, contact.lastName].filter(Boolean).join(" ") || "—"}
                    </h4>
                    <span className="text-xs text-muted-foreground block truncate max-w-[200px]">
                      {contact.email}
                    </span>
                  </div>
                </div>
                
                {/* Options button */}
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" />}>
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleCopyEmail(contact.email)} className="text-xs">
                      Copy Email
                    </DropdownMenuItem>
                    <Link href={`/contacts/${contact.id}`} passHref>
                      <DropdownMenuItem className="text-xs">
                        View Details
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-xs text-destructive"
                      onClick={() => handleDelete(contact.id)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Status and Tags stack */}
              <div className="flex items-center justify-between border-t pt-2 mt-1">
                <Badge 
                  variant={contact.status === "ACTIVE" ? "default" : "secondary"}
                  className={`text-[9px] font-bold ${
                    contact.status === "ACTIVE" 
                      ? "bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20" 
                      : "bg-amber-500/10 text-amber-500"
                  }`}
                >
                  {contact.status}
                </Badge>
                
                <div className="flex flex-wrap gap-1 max-w-[65%] justify-end">
                  {contact.tags.map((tag: Tag) => (
                    <Badge key={tag.id} variant="outline" className={`text-[9px] px-1.5 py-0 border transition-all duration-200 hover:scale-[1.02] shadow-xs ${getTagColorClass(tag.name)}`}>
                      {tag.name}
                    </Badge>
                  ))}
                  {contact.tags.length === 0 && <span className="text-muted-foreground text-[10px]">—</span>}
                </div>
              </div>
            </div>
          ))}

          {filteredContacts.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No contacts found.
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
