"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, Loader2, Check } from "lucide-react"

interface ImageCropperDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageSrc: string
  filename?: string
  onCropComplete: (croppedFile: File) => void | Promise<void>
}

export function ImageCropperDialog({
  open,
  onOpenChange,
  imageSrc,
  filename = "avatar.png",
  onCropComplete,
}: ImageCropperDialogProps) {
  const [zoom, setZoom] = React.useState<number>(1)
  const [offset, setOffset] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = React.useState<boolean>(false)
  const [dragStart, setDragStart] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isCropping, setIsCropping] = React.useState<boolean>(false)

  const imgRef = React.useRef<HTMLImageElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Reset states when a new image is loaded
  React.useEffect(() => {
    if (open) {
      setZoom(1)
      setOffset({ x: 0, y: 0 })
      setIsCropping(false)
    }
  }, [open, imageSrc])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUpOrLeave = () => {
    setIsDragging(false)
  }

  // Touch handlers for mobile devices
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    setIsDragging(true)
    const touch = e.touches[0]
    setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y })
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return
    const touch = e.touches[0]
    setOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    })
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 3))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 1))
  }

  const executeCrop = async () => {
    if (!imgRef.current) return
    setIsCropping(true)

    try {
      const canvas = document.createElement("canvas")
      const cropSize = 250
      canvas.width = cropSize
      canvas.height = cropSize
      const ctx = canvas.getContext("2d")

      if (ctx) {
        ctx.clearRect(0, 0, cropSize, cropSize)
        ctx.save()
        
        // Move to the center of the canvas where the crop circle sits
        ctx.translate(cropSize / 2, cropSize / 2)
        ctx.scale(zoom, zoom)
        // Apply offset, scaled down by zoom to match translation scaling
        ctx.translate(offset.x / zoom, offset.y / zoom)

        const img = imgRef.current
        const imgWidth = img.naturalWidth
        const imgHeight = img.naturalHeight

        // Fit image inside crop circle area (200px container default size)
        const containerSize = 200
        let renderWidth = containerSize
        let renderHeight = containerSize

        const aspectRatio = imgWidth / imgHeight
        if (aspectRatio > 1) {
          renderWidth = containerSize * aspectRatio
        } else {
          renderHeight = containerSize / aspectRatio
        }

        ctx.drawImage(
          img,
          -renderWidth / 2,
          -renderHeight / 2,
          renderWidth,
          renderHeight
        )

        ctx.restore()

        await new Promise<void>((resolve, reject) => {
          canvas.toBlob(async (blob) => {
            if (blob) {
              try {
                const croppedFile = new File([blob], filename, { type: "image/png" })
                await onCropComplete(croppedFile)
                resolve()
              } catch (err) {
                reject(err)
              }
            } else {
              reject(new Error("Canvas blob creation failed"))
            }
          }, "image/png")
        })
      }
    } catch (error) {
      console.error("Cropping failed:", error)
    } finally {
      setIsCropping(false)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]" showCloseButton={!isCropping}>
        <DialogHeader className="pb-2 border-b">
          <DialogTitle className="text-base font-bold">Crop Profile Photo</DialogTitle>
          <DialogDescription className="text-xs">
            Drag the image to adjust position and use zoom slider.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center space-y-4 py-4">
          {/* Crop Container */}
          <div
            ref={containerRef}
            className="w-[260px] h-[260px] relative bg-zinc-950 rounded-xl border border-border overflow-hidden flex items-center justify-center cursor-grab select-none active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Dashed Circular Highlight Crop Ring Overlay */}
            <div className="absolute w-[200px] h-[200px] rounded-full border-2 border-dashed border-white/80 pointer-events-none z-10 shadow-[0_0_0_9999px_rgba(9,9,11,0.75)]" />

            {/* The Raw Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop target"
              draggable={false}
              className="max-w-none origin-center pointer-events-none"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                transition: isDragging ? "none" : "transform 0.1s ease-out",
                width: "200px",
                height: "auto",
              }}
            />
          </div>

          {/* Zoom Slider and Controls */}
          <div className="w-full flex items-center gap-3 px-2">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={handleZoomOut}
              disabled={isCropping}
              className="shrink-0"
              type="button"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <input
              type="range"
              min="1"
              max="3"
              step="0.02"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              disabled={isCropping}
              className="flex-1 accent-primary h-1 bg-muted rounded-lg appearance-none cursor-pointer"
            />
            <Button
              variant="outline"
              size="icon-sm"
              onClick={handleZoomIn}
              disabled={isCropping}
              className="shrink-0"
              type="button"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <DialogFooter className="border-t pt-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isCropping}
            className="text-xs h-9 flex-1"
            type="button"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={executeCrop}
            disabled={isCropping}
            className="text-xs h-9 bg-primary hover:bg-primary/90 text-white font-semibold flex-1"
            type="button"
          >
            {isCropping ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Crop & Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
