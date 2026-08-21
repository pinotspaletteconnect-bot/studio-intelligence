"use client"

import { MarketingDashboard } from "@/components/studio/marketing/marketing-dashboard"
import { DashboardToolbar } from "@/components/studio/shared/dashboard-toolbar"
import Link from "next/link"
import { MapPin } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

export default function MarketingPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <DashboardToolbar
        title="Marketing Performance"
        subtitle="Track and compare performance across every connected marketing source."
      />
      <div className="flex justify-end"><Link href="/marketing/order-geography" className={buttonVariants({ variant: "outline" })}><MapPin />Order geography &amp; discounts</Link></div>
      <MarketingDashboard />
    </div>
  )
}
