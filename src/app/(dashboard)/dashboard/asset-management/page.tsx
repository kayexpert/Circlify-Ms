import type { Metadata } from "next"
import { AssetManagementPageClient } from "./asset-management-page-client"

export const metadata: Metadata = {
  title: "Asset Management",
  description: "Manage church assets, disposals, and categories",
}

export default function AssetManagementPage() {
  return <AssetManagementPageClient />
}
