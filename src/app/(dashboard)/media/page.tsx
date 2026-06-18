export const dynamic = "force-dynamic"

import { getMediaFiles } from "@/app/actions/media"
import { MediaClient } from "./media-client"

export default async function MediaLibraryPage() {
  const result = await getMediaFiles()
  const media = result.success && result.data ? result.data : []

  return <MediaClient initialMedia={media} />
}
