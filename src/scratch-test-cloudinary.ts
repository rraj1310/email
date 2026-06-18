import { uploadToCloudinary } from "./lib/cloudinary"
import * as fs from "fs"
import * as path from "path"

// Manually parse .env file
const envPath = path.resolve(process.cwd(), ".env")
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8")
  envContent.split("\n").forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) return
    const index = trimmed.indexOf("=")
    if (index > 0) {
      const key = trimmed.substring(0, index).trim()
      let val = trimmed.substring(index + 1).trim()
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1)
      }
      process.env[key] = val
    }
  })
}

async function main() {
  // Create a tiny dummy buffer for testing
  const dummyBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  )
  
  console.log("Testing Cloudinary upload with loaded env...")
  console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME)
  console.log("API Key:", process.env.CLOUDINARY_API_KEY)
  console.log("API Secret:", process.env.CLOUDINARY_API_SECRET)
  
  const res = await uploadToCloudinary(dummyBuffer, "test_dummy.png")
  console.log("Cloudinary response:", JSON.stringify(res, null, 2))
}

main()
