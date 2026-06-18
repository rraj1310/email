import { NextResponse } from "next/server"
import { createMediaRecord } from "@/app/actions/media"
import fs from "fs"
import path from "path"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = file.name.replace(/\s+/g, "_")
    
    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), "public", "uploads")
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const filePath = path.join(uploadDir, filename)
    fs.writeFileSync(filePath, buffer)
    
    const fileUrl = `/uploads/${filename}`
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
