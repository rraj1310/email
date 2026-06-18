"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Mail, Phone, MapPin, Clock, MousePointerClick, User, Save, Trash2, Edit, Sparkles, Tag as TagIcon, Check, Cake } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Contact, Tag } from "@prisma/client"
import { updateContact, deleteContact } from "@/app/actions/contacts"
import { toast } from "sonner"

type ContactWithTags = Contact & { tags: Tag[] }

interface ContactDetailsClientProps {
  contact: ContactWithTags
  activities: Array<{
    id: string
    type: "activity" | "automation"
    action: string
    details: string | null
    time: string
  }>
  automationStates: Array<{
    id: string
    automationRuleId: string
    automationRule: { name: string }
    status: string
    currentStepId: string | null
    enteredAt: Date | string
    completedAt: Date | string | null
    exitReason: string | null
  }>
}

export function ContactDetailsClient({ contact: initialContact, activities, automationStates }: ContactDetailsClientProps) {
  const [contact, setContact] = React.useState<ContactWithTags>(initialContact)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const router = useRouter()

  // Form edit states
  const [editFirstName, setEditFirstName] = React.useState(contact.firstName || "")
  const [editLastName, setEditLastName] = React.useState(contact.lastName || "")
  const [editPhone, setEditPhone] = React.useState(contact.phone || "")
  const [editCity, setEditCity] = React.useState(contact.city || "")
  const [editCountry, setEditCountry] = React.useState(contact.country || "")
  const [editStatus, setEditStatus] = React.useState(contact.status)
  const [editTagsString, setEditTagsString] = React.useState(contact.tags.map(t => t.name).join(", "))
  const [editBirthday, setEditBirthday] = React.useState(contact.birthday ? new Date(contact.birthday).toISOString().split("T")[0] : "")

  // Parsed custom fields
  const customFieldsObj = React.useMemo(() => {
    if (typeof contact.customFields === "string") {
      try {
        return JSON.parse(contact.customFields)
      } catch {
        return {}
      }
    }
    return (contact.customFields as Record<string, any>) || {}
  }, [contact.customFields])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const parsedTags = editTagsString
        .split(",")
        .map(t => t.trim())
        .filter(Boolean)

      const result = await updateContact(contact.id, {
        firstName: editFirstName,
        lastName: editLastName,
        phone: editPhone,
        city: editCity,
        country: editCountry,
        birthday: editBirthday || null,
        status: editStatus,
        tags: parsedTags
      })

      if (result.success && result.data) {
        toast.success("Contact details updated successfully.")
        const resData = result.data as ContactWithTags
        setContact(resData)
        setEditFirstName(resData.firstName || "")
        setEditLastName(resData.lastName || "")
        setEditPhone(resData.phone || "")
        setEditCity(resData.city || "")
        setEditCountry(resData.country || "")
        setEditBirthday(resData.birthday ? new Date(resData.birthday).toISOString().split("T")[0] : "")
        setEditStatus(resData.status)
        setIsEditOpen(false)
      } else {
        toast.error(result.error || "Failed to update contact details.")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to update contact.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteContact = async () => {
    if (!confirm("Are you sure you want to permanently delete this contact?")) return
    
    try {
      const result = await deleteContact(contact.id)
      if (result.success) {
        toast.success("Contact has been deleted.")
        router.push("/contacts")
      } else {
        toast.error(result.error || "Failed to delete contact.")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to delete contact.")
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Back Link */}
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
        <Link href="/contacts" className="hover:text-foreground transition-colors flex items-center gap-1 font-medium">
          <ArrowLeft className="h-4 w-4" />
          Back to Contacts
        </Link>
        
        <div className="flex items-center gap-2">
          {/* Edit Dialog */}
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger render={<Button size="sm" variant="outline" className="h-8 text-xs" />}>
              <Edit className="mr-1.5 h-3.5 w-3.5" />
              Edit Profile
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <form onSubmit={handleUpdate}>
                <DialogHeader className="pb-3 border-b mb-4">
                  <DialogTitle className="text-lg font-bold">Edit Profile Details</DialogTitle>
                  <DialogDescription className="text-xs">
                    Update profile parameters for {contact.email}.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="editFirstName" className="text-xs font-semibold">First Name</Label>
                      <Input 
                        id="editFirstName" 
                        value={editFirstName} 
                        onChange={(e) => setEditFirstName(e.target.value)} 
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="editLastName" className="text-xs font-semibold">Last Name</Label>
                      <Input 
                        id="editLastName" 
                        value={editLastName} 
                        onChange={(e) => setEditLastName(e.target.value)} 
                      />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="editPhone" className="text-xs font-semibold">Phone Number</Label>
                    <Input 
                      id="editPhone" 
                      value={editPhone} 
                      onChange={(e) => setEditPhone(e.target.value)} 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="editCity" className="text-xs font-semibold">City</Label>
                      <Input 
                        id="editCity" 
                        value={editCity} 
                        onChange={(e) => setEditCity(e.target.value)} 
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="editCountry" className="text-xs font-semibold">Country</Label>
                      <Input 
                        id="editCountry" 
                        value={editCountry} 
                        onChange={(e) => setEditCountry(e.target.value)} 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="editStatus" className="text-xs font-semibold">Status</Label>
                      <select 
                        id="editStatus" 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as any)}
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="UNSUBSCRIBED">Unsubscribed</option>
                        <option value="BOUNCED">Bounced</option>
                      </select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="editBirthday" className="text-xs font-semibold">Birthday</Label>
                      <Input 
                        id="editBirthday" 
                        type="date"
                        value={editBirthday} 
                        onChange={(e) => setEditBirthday(e.target.value)} 
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="editTags" className="text-xs font-semibold">Tags (Comma-separated)</Label>
                      <Input 
                        id="editTags" 
                        value={editTagsString} 
                        onChange={(e) => setEditTagsString(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter className="mt-6 pt-4 border-t">
                  <Button variant="outline" type="button" onClick={() => setIsEditOpen(false)} disabled={isSaving} className="text-xs h-9">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving} className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white">
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Button size="sm" variant="outline" className="h-8 text-xs text-destructive hover:bg-destructive/10 border-destructive/30" onClick={handleDeleteContact}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Main Grid: Responsive Columns */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Profile Card */}
        <div className="w-full lg:w-1/3 space-y-6 shrink-0">
          <Card className="border shadow-xs">
            <CardHeader className="pb-4 border-b">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="h-12 w-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-lg mb-2">
                    {(contact.firstName?.[0] || contact.email[0]).toUpperCase()}
                  </div>
                  <CardTitle className="text-xl font-bold">
                    {[contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Unnamed Contact"}
                  </CardTitle>
                  <CardDescription className="flex items-center text-xs break-all gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {contact.email}
                  </CardDescription>
                </div>
                <Badge 
                  variant={contact.status === "ACTIVE" ? "default" : "secondary"}
                  className={`text-[9px] font-bold ${
                    contact.status === "ACTIVE" 
                      ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10" 
                      : "bg-amber-500/10 text-amber-500 hover:bg-amber-500/10"
                  }`}
                >
                  {contact.status}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6 pt-6 text-sm">
              {/* Tags Section */}
              <div className="space-y-2">
                <h4 className="font-semibold text-xs uppercase text-muted-foreground flex items-center gap-1.5">
                  <TagIcon className="h-3.5 w-3.5" />
                  Tags
                </h4>
                <div className="flex gap-1.5 flex-wrap">
                  {contact.tags?.map((tag) => (
                    <Badge key={tag.id} variant="outline" className="text-[10px] bg-muted/40 py-0.5 px-2">
                      {tag.name}
                    </Badge>
                  ))}
                  {contact.tags.length === 0 && <span className="text-muted-foreground text-xs">—</span>}
                </div>
              </div>
              
              <Separator />
              
              {/* Contact Attributes */}
              <div className="space-y-3">
                <h4 className="font-semibold text-xs uppercase text-muted-foreground">About Information</h4>
                <div className="flex items-center text-xs text-muted-foreground gap-2">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{contact.phone || "No phone number registered"}</span>
                </div>
                <div className="flex items-center text-xs text-muted-foreground gap-2">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>{contact.city ? `${contact.city}, ${contact.country || ''}` : "No geographic data"}</span>
                </div>
                {contact.birthday && (
                  <div className="flex items-center text-xs text-muted-foreground gap-2">
                    <Cake className="h-4 w-4 shrink-0 text-amber-500" />
                    <span>Birthday: {new Date(contact.birthday).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Custom fields (e.g. Industry, Company) */}
              <div className="space-y-3">
                <h4 className="font-semibold text-xs uppercase text-muted-foreground">
                  Custom Fields
                </h4>
                <div className="space-y-2 border rounded-md p-3 bg-muted/20">
                  {Object.keys(customFieldsObj).length > 0 ? (
                    Object.entries(customFieldsObj).map(([key, val]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-medium">{key}</span>
                        <span className="font-semibold text-foreground">{String(val)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-1">No custom properties</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs section */}
        <div className="w-full lg:flex-1">
          <Tabs defaultValue="activity" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted/30 p-1 border rounded-md">
              <TabsTrigger value="activity" className="text-xs font-semibold py-2">Activity Timeline</TabsTrigger>
              <TabsTrigger value="campaigns" className="text-xs font-semibold py-2">Campaign Logs</TabsTrigger>
              <TabsTrigger value="notes" className="text-xs font-semibold py-2">Notes</TabsTrigger>
            </TabsList>
            
            {/* Timeline tab */}
            <TabsContent value="activity" className="mt-4">
              <Card className="border">
                <CardHeader>
                  <CardTitle className="text-base font-bold">Historical Events</CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-muted">
                    {activities && activities.length > 0 ? (
                      activities.map((act) => {
                        const icon = (() => {
                          const norm = act.action.toLowerCase();
                          if (norm.includes("email sent") || norm.includes("sent campaign") || norm.includes("email campaign") || norm.includes("send email")) {
                            return <Mail className="h-3.5 w-3.5 text-blue-500" />;
                          }
                          if (norm.includes("opened") || norm.includes("open")) {
                            return <Clock className="h-3.5 w-3.5 text-amber-500" />;
                          }
                          if (norm.includes("clicked") || norm.includes("click")) {
                            return <MousePointerClick className="h-3.5 w-3.5 text-indigo-500" />;
                          }
                          if (norm.includes("entered") || norm.includes("enroll")) {
                            return <Sparkles className="h-3.5 w-3.5 text-purple-500" />;
                          }
                          if (norm.includes("completed") || norm.includes("success") || norm.includes("executed")) {
                            return <Check className="h-3.5 w-3.5 text-emerald-500" />;
                          }
                          if (norm.includes("failed") || norm.includes("bounce") || norm.includes("error")) {
                            return <Trash2 className="h-3.5 w-3.5 text-rose-500" />;
                          }
                          if (norm.includes("created")) {
                            return <User className="h-3.5 w-3.5 text-emerald-500" />;
                          }
                          if (norm.includes("tag")) {
                            return <TagIcon className="h-3.5 w-3.5 text-cyan-500" />;
                          }
                          return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
                        })();

                        const containerClass = (() => {
                          const norm = act.action.toLowerCase();
                          if (norm.includes("email sent") || norm.includes("sent campaign") || norm.includes("email campaign") || norm.includes("send email")) {
                            return "border-blue-200 bg-blue-50 dark:bg-blue-950/20";
                          }
                          if (norm.includes("opened") || norm.includes("open")) {
                            return "border-amber-200 bg-amber-50 dark:bg-amber-950/20";
                          }
                          if (norm.includes("clicked") || norm.includes("click")) {
                            return "border-indigo-200 bg-indigo-50 dark:bg-indigo-950/20";
                          }
                          if (norm.includes("entered") || norm.includes("enroll")) {
                            return "border-purple-200 bg-purple-50 dark:bg-purple-950/20";
                          }
                          if (norm.includes("completed") || norm.includes("success") || norm.includes("executed")) {
                            return "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20";
                          }
                          if (norm.includes("failed") || norm.includes("bounce") || norm.includes("error")) {
                            return "border-rose-200 bg-rose-50 dark:bg-rose-950/20";
                          }
                          return "border-muted bg-muted/20";
                        })();

                        return (
                          <div key={act.id} className="flex gap-4 group relative">
                            <div className={`h-6 w-6 rounded-full border flex items-center justify-center shrink-0 z-10 transition-colors ${containerClass}`}>
                              {icon}
                            </div>
                            
                            <div className="space-y-1 bg-muted/20 hover:bg-muted/40 transition-colors p-3 rounded-md border flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-xs text-foreground/90">{act.action}</span>
                                <time className="text-[10px] text-muted-foreground">{act.time}</time>
                              </div>
                              {act.details && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {act.details}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground text-xs">
                        <Clock className="h-8 w-8 mb-2 opacity-50" />
                        No activities logged for this contact yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="campaigns" className="mt-4">
              <Card className="border">
                <CardHeader>
                  <CardTitle className="text-base font-bold">Automation Workflows</CardTitle>
                  <CardDescription className="text-xs">
                    Workflows this contact has entered and their current execution status.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="space-y-4">
                    {automationStates && automationStates.length > 0 ? (
                      automationStates.map((state) => (
                        <div key={state.id} className="flex items-center justify-between border p-3 rounded-lg bg-muted/10">
                          <div className="space-y-1">
                            <span className="font-bold text-xs text-foreground/90">
                              {state.automationRule?.name || "Unnamed Workflow"}
                            </span>
                            <div className="flex gap-3 text-[10px] text-muted-foreground">
                              <span>Enrolled: {new Date(state.enteredAt).toLocaleDateString()}</span>
                              {state.completedAt && (
                                <span>Finished: {new Date(state.completedAt).toLocaleDateString()}</span>
                              )}
                              {state.exitReason && <span className="text-rose-500 font-semibold">Reason: {state.exitReason}</span>}
                            </div>
                          </div>
                          
                          <Badge 
                            variant="outline" 
                            className={`text-[9px] font-semibold py-0.5 px-2 ${
                              state.status === "ACTIVE" 
                                ? "bg-blue-500/10 text-blue-500 border-blue-500/20" 
                                : state.status === "COMPLETED"
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                            }`}
                          >
                            {state.status}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground text-xs py-8">
                        This contact has not entered any automation rules.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <Card className="border">
                <CardContent className="pt-6 text-center text-muted-foreground text-xs py-12">
                  Notes catalog has not been initialized.
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

      </div>
    </div>
  )
}
