"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, UploadCloud, Folder, Image as ImageIcon, FileText, FileArchive, MoreVertical, MoreHorizontal, Trash2, Edit2, Link as LinkIcon, Loader2, Compass } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Label } from "@/components/ui/label"
import { Media } from "@prisma/client"
import { renameMediaFile, deleteMediaFile } from "@/app/actions/media"
import { toast } from "sonner"

interface MediaClientProps {
  initialMedia: Media[]
}

export function MediaClient({ initialMedia }: MediaClientProps) {
  const [mediaList, setMediaList] = React.useState<Media[]>(initialMedia)
  const [search, setSearch] = React.useState("")
  const [isUploading, setIsUploading] = React.useState(false)
  const [isRenameOpen, setIsRenameOpen] = React.useState(false)
  
  // Selected media states
  const [selectedMediaId, setSelectedMediaId] = React.useState<string | null>(null)
  const [renameValue, setRenameValue] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)
  
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Filter media files
  const filteredMedia = React.useMemo(() => {
    return mediaList.filter(item => 
      item.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [mediaList, search])

  // Trigger file upload
  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch("/api/media/upload", {
        method: "POST",
        body: formData
      })
      const result = await response.json()
      
      if (result.success && result.data) {
        toast.success(`Successfully uploaded "${file.name}"`)
        setMediaList([result.data as Media, ...mediaList])
      } else {
        toast.error(result.error || "Upload failed")
      }
    } catch (err) {
      console.error(err)
      toast.error("An error occurred during file upload.")
    } finally {
      setIsUploading(false)
      // Reset input value
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // Handle Rename Submit
  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMediaId || !renameValue.trim()) return

    setIsSaving(true)
    try {
      const result = await renameMediaFile(selectedMediaId, renameValue.trim())
      if (result.success && result.data) {
        toast.success("File renamed successfully!")
        setMediaList(mediaList.map(item => item.id === selectedMediaId ? result.data as Media : item))
        setIsRenameOpen(false)
        setSelectedMediaId(null)
        setRenameValue("")
      } else {
        toast.error(result.error || "Failed to rename file")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to rename file.")
    } finally {
      setIsSaving(false)
    }
  }

  // Handle Copy URL
  const handleCopyUrl = (url: string) => {
    const fullUrl = `${window.location.origin}${url}`
    navigator.clipboard.writeText(fullUrl)
    toast.success("File URL copied to clipboard")
  }

  // Handle Delete
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this file?")) return

    try {
      const result = await deleteMediaFile(id)
      if (result.success) {
        toast.success("File deleted successfully.")
        setMediaList(mediaList.filter(item => item.id !== id))
      } else {
        toast.error(result.error || "Failed to delete file.")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to delete file.")
    }
  }

  // Format File Size
  const formatBytes = (bytes?: number | null) => {
    if (!bytes) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Media Library</h2>
          <p className="text-muted-foreground text-sm">
            Upload and manage images, assets, and document templates for your campaigns.
          </p>
        </div>
        
        <div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
          />
          <Button 
            disabled={isUploading} 
            onClick={handleUploadClick}
            className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Uploading File...
              </>
            ) : (
              <>
                <UploadCloud className="mr-1.5 h-3.5 w-3.5" />
                Upload File
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-sm w-full">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input 
          type="search" 
          placeholder="Search files..." 
          className="pl-9 w-full h-10 text-sm shadow-xs" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Grid gallery */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-6">
        {filteredMedia.map((item) => {
          const extension = item.name.split(".").pop()?.toLowerCase() || ""
          const isImage = ["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(extension)

          return (
            <Card key={item.id} className="group overflow-hidden relative border shadow-xs hover:shadow-md hover:scale-[1.01] transition-all duration-300 bg-card">
              
              {/* Thumbnail Area */}
              <div className="aspect-square bg-muted/40 flex items-center justify-center p-0.5 relative border-b overflow-hidden">
                {isImage ? (
                  // Display physical image if uploaded, or fallback to icon
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={item.url} 
                    alt={item.name} 
                    className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" 
                    onError={(e) => {
                      // Fallback if load fails
                      e.currentTarget.style.display = "none"
                      const icon = e.currentTarget.nextElementSibling as HTMLElement
                      if (icon) icon.style.display = "block"
                    }}
                  />
                ) : null}

                {/* Icons fallbacks based on type */}
                <div className={`hidden absolute text-muted-foreground/60 ${isImage ? "inset-0 flex items-center justify-center bg-muted" : "block"}`}>
                  {isImage ? (
                    <ImageIcon className="h-12 w-12 opacity-60" />
                  ) : ["pdf", "doc", "docx", "txt"].includes(extension) ? (
                    <FileText className="h-12 w-12 opacity-60 text-blue-500" />
                  ) : ["zip", "rar", "tar", "gz"].includes(extension) ? (
                    <FileArchive className="h-12 w-12 opacity-60 text-amber-500" />
                  ) : (
                    <Folder className="h-12 w-12 opacity-60" />
                  )}
                </div>

                {!isImage && (
                  <div className="absolute text-muted-foreground/60">
                    {["pdf", "doc", "docx", "txt"].includes(extension) ? (
                      <FileText className="h-12 w-12 opacity-60 text-blue-500" />
                    ) : ["zip", "rar", "tar", "gz"].includes(extension) ? (
                      <FileArchive className="h-12 w-12 opacity-60 text-amber-500" />
                    ) : (
                      <Folder className="h-12 w-12 opacity-60" />
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer Details */}
              <CardContent className="p-2.5">
                <div className="flex justify-between items-start">
                  <div className="truncate pr-1">
                    <p className="text-xs font-semibold text-foreground truncate" title={item.name}>
                      {item.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatBytes(item.size)}
                    </p>
                  </div>

                  {/* Actions Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 hover:bg-muted" />}>
                      <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleCopyUrl(item.url)} className="text-xs">
                        <LinkIcon className="mr-1.5 h-3.5 w-3.5" /> Copy URL
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedMediaId(item.id)
                        setRenameValue(item.name)
                        setIsRenameOpen(true)
                      }} className="text-xs">
                        <Edit2 className="mr-1.5 h-3.5 w-3.5" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDelete(item.id)} className="text-xs text-destructive hover:bg-destructive/10">
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>

            </Card>
          )
        })}

        {filteredMedia.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground text-xs flex flex-col items-center justify-center border border-dashed rounded-lg bg-muted/10 h-64">
            <Compass className="h-10 w-10 mb-2 opacity-50" />
            <h3 className="text-md font-semibold text-foreground">Media Gallery Empty</h3>
            <p className="text-[11px] max-w-sm mt-1">
              Upload images or documents to include in your newsletters.
            </p>
          </div>
        )}
      </div>

      {/* Rename Dialog Modal */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={handleRenameSubmit}>
            <DialogHeader className="pb-3 border-b mb-4">
              <DialogTitle className="text-lg font-bold">Rename Asset</DialogTitle>
              <DialogDescription className="text-xs">
                Enter a new name for the file including its extension.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor="rename" className="text-xs font-semibold">File Name</Label>
                <Input 
                  id="rename" 
                  value={renameValue} 
                  onChange={(e) => setRenameValue(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <DialogFooter className="mt-6 pt-4 border-t">
              <Button variant="outline" type="button" onClick={() => setIsRenameOpen(false)} disabled={isSaving} className="text-xs h-9">
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white">
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
