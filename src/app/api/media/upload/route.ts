import { NextResponse } from "next/server"
import { createMediaRecord } from "@/app/actions/media"
import { uploadToCloudinary } from "@/lib/cloudinary"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = file.name.replace(/\s+/g, "_")
    
    // Call Cloudinary signed upload utility
    const uploadResult = await uploadToCloudinary(buffer, filename)
    
    if (!uploadResult.success || !uploadResult.url) {
      return NextResponse.json(
        { success: false, error: uploadResult.error || "Cloudinary upload failed" },
        { status: 500 }
      )
    }

    const fileUrl = uploadResult.url
    const fileSize = file.size

    // Write to DB
    const dbResult = await createMediaRecord(filename, fileUrl, fileSize)
    if (!dbResult.success) {
      return NextResponse.json({ success: false, error: dbResult.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: dbResult.data })
  } catch (error) {
    console.error("Upload API error:", error)
    return NextResponse.json({ success: false, error: "Failed to upload file" }, { status: 500 })
  }
}

