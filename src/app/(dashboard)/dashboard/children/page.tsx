import { ChildrenPageClient } from "./children-page-client"

export const metadata = {
    title: "Kidz Church",
    description: "Manage children ministry and attendance",
}

export default function ChildrenPage() {
    return (
        <div className="space-y-6">

            <ChildrenPageClient />
        </div>
    )
}
