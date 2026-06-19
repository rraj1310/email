"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  Bot,
  Command,
  LifeBuoy,
  PieChart,
  Settings2,
  Users,
  Megaphone,
  Image as ImageIcon,
  ShieldAlert,
  BarChart,
  ChevronsUpDown,
  Plus,
  Building2,
  Check,
  Loader2,
  LogOut,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { signOut } from "next-auth/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { getWorkspaces, switchWorkspace, createWorkspace } from "@/app/actions/workspace"
import { PlanType } from "@/lib/plans"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

const data = {
  navMain: [
    {
      title: "Dashboard",
      description: "Overview, stats & activity feed",
      url: "/",
      icon: PieChart,
    },
    {
      title: "Contacts",
      description: "Manage & tag your subscribers",
      url: "/contacts",
      icon: Users,
    },
    {
      title: "Campaigns",
      description: "Draft & send bulk emails",
      url: "/campaigns",
      icon: Megaphone,
    },
    {
      title: "Automations",
      description: "Auto birthday & welcome emails",
      url: "/automations",
      icon: Bot,
    },
    {
      title: "Media Library",
      description: "Store images & files",
      url: "/media",
      icon: ImageIcon,
    },
    {
      title: "Suppression",
      description: "Unsubscribed & blocklisted emails",
      url: "/suppression",
      icon: ShieldAlert,
    },
    {
      title: "Reports",
      description: "Open rates, clicks & charts",
      url: "/reports",
      icon: BarChart,
    },
    {
      title: "Settings",
      description: "Workspace branding & config",
      url: "/settings",
      icon: Settings2,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const router = useRouter()
  const [orgName, setOrgName] = React.useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("org_name")
      return stored || "Acme Corp"
    }
    return "Acme Corp"
  })

  const [workspaces, setWorkspaces] = React.useState<Array<{
    id: string
    name: string
    plan: PlanType
    role: string
    color: string | null
    logo: string | null
  }>>([])
  const [activeWorkspace, setActiveWorkspace] = React.useState<{
    id: string
    name: string
    plan: PlanType
    role: string
  } | null>(null)
  
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = React.useState("")
  const [isCreating, setIsCreating] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)

  const loadWorkspaces = React.useCallback(async () => {
    try {
      const res = await getWorkspaces()
      if (res.success && res.data) {
        setWorkspaces(res.data)
        if (typeof window !== "undefined") {
          const storedOrgId = localStorage.getItem("active_org_id")
          const active = res.data.find(w => w.id === storedOrgId) || res.data[0]
          if (active) {
            setActiveWorkspace({
              id: active.id,
              name: active.name,
              plan: active.plan,
              role: active.role
            })
            localStorage.setItem("active_org_id", active.id)
            localStorage.setItem("org_name", active.name)
            setOrgName(active.name)
          }
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadWorkspaces()
  }, [loadWorkspaces])

  // Listen for storage updates to keep sidebar synced
  React.useEffect(() => {
    const handleStorage = () => {
      const updated = localStorage.getItem("org_name")
      if (updated) setOrgName(updated)
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  const handleSwitch = async (id: string) => {
    const toastId = toast.loading("Switching workspace...")
    try {
      const res = await switchWorkspace(id)
      if (res.success) {
        localStorage.setItem("active_org_id", id)
        const newActive = workspaces.find(w => w.id === id)
        if (newActive) {
          localStorage.setItem("org_name", newActive.name)
          setActiveWorkspace({
            id: newActive.id,
            name: newActive.name,
            plan: newActive.plan,
            role: newActive.role
          })
          setOrgName(newActive.name)
        }
        toast.success("Workspace switched!", { id: toastId })
        window.location.reload()
      } else {
        toast.error(res.error || "Failed to switch workspace", { id: toastId })
      }
    } catch (err) {
      toast.error("An error occurred", { id: toastId })
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWorkspaceName.trim()) return
    setIsCreating(true)
    try {
      const res = await createWorkspace(newWorkspaceName)
      if (res.success && res.data) {
        toast.success("Workspace created!")
        setIsCreateOpen(false)
        setNewWorkspaceName("")
        localStorage.setItem("active_org_id", res.data.id)
        localStorage.setItem("org_name", res.data.name)
        window.location.reload()
      } else {
        toast.error(res.error || "Failed to create workspace")
      }
    } catch (err) {
      toast.error("Failed to create workspace")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 p-2 select-none">
              <div className="bg-gradient-to-tr from-emerald-500 to-teal-500 text-slate-950 flex aspect-square size-8 items-center justify-center rounded-lg shadow-md shrink-0">
                <Building2 className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                <span className="truncate font-bold text-foreground">
                  {activeWorkspace?.name || orgName}
                </span>
                <span className="truncate text-[10px] text-muted-foreground flex items-center gap-1">
                  Active Workspace
                </span>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarMenu>
          {data.navMain.map((item) => {
            const isActive = item.url === "/" 
              ? pathname === "/" 
              : pathname === item.url || pathname.startsWith(item.url + "/")

            return (
              <SidebarMenuItem key={item.title}>
                <Link href={item.url} passHref legacyBehavior>
                  <SidebarMenuButton 
                    tooltip={item.title} 
                    isActive={isActive}
                    className={`transition-all duration-200 py-6 h-auto ${
                      isActive 
                        ? "bg-primary text-primary-foreground font-semibold shadow-sm scale-[1.02]" 
                        : "hover:bg-sidebar-accent/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <item.icon className={`size-4.5 shrink-0 mt-0.5 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                    <div className="flex flex-col text-left leading-normal">
                      <span className="text-sm font-semibold">{item.title}</span>
                      <span className={`text-[10px] font-normal leading-tight group-data-[collapsible=icon]:hidden ${
                        isActive ? "text-primary-foreground/75" : "text-muted-foreground/80"
                      }`}>{item.description}</span>
                    </div>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/settings" passHref legacyBehavior>
              <SidebarMenuButton className="hover:bg-sidebar-accent/50 text-muted-foreground hover:text-foreground">
                <LifeBuoy className="size-4" />
                <span>Help & Settings</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={() => signOut({ callbackUrl: "/login" })} 
              className="hover:bg-rose-500/10 dark:hover:bg-rose-950/30 text-muted-foreground hover:text-rose-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
            >
              <LogOut className="size-4" />
              <span>Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Create Workspace</DialogTitle>
              <DialogDescription>
                Add a new workspace to organize your campaigns, contacts, and custom templates.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="newWorkspaceName">Workspace Name</Label>
                <Input
                  id="newWorkspaceName"
                  placeholder="e.g. Acme Corp Retail"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isCreating && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Create Workspace
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Sidebar>
  )
}
