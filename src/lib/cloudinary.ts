import crypto from "crypto"

/**
 * Uploads a file buffer to Cloudinary using secure server-side signature generation.
 * 
 * @param fileBuffer The file content as a Buffer.
 * @param filename The original filename.
 * @returns A promise resolving to the upload result containing the secure URL.
 */
export async function uploadToCloudinary(
  fileBuffer: Buffer,
  filename: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    return {
      success: false,
      error: "Cloudinary credentials are not configured in environment variables."
    }
  }

  try {
    const timestamp = Math.round(new Date().getTime() / 1000).toString()
    
    // Sort parameters alphabetically. We only sign parameters that we pass to the upload call
    // (excluding file, api_key, and signature).
    const signatureString = `timestamp=${timestamp}${apiSecret}`
    
    // Create SHA-1 signature
    const signature = crypto.createHash("sha1").update(signatureString).digest("hex")

    // Construct FormData to send to Cloudinary
    const formData = new FormData()
    
    // Create a Blob from the file buffer to send in FormData
    const blob = new Blob([new Uint8Array(fileBuffer)])
    formData.append("file", blob, filename)
    formData.append("api_key", apiKey)
    formData.append("timestamp", timestamp)
    formData.append("signature", signature)

    // Call Cloudinary REST API
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    })

    const data = await response.json() as any
    if (data.error) {
      return { success: false, error: data.error.message }
    }

    return { success: true, url: data.secure_url }
  } catch (error: any) {
    console.error("Cloudinary upload helper error:", error)
    return { success: false, error: error.message || "Upload failed" }
  }
}
