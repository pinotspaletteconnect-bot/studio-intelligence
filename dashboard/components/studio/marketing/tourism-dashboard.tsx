"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, MapPinned } from "lucide-react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useApp } from "@/contexts/app-context"
import { DashboardToolbar } from "@/components/studio/shared/dashboard-toolbar"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { applyStateExclusions } from "@/lib/reports/tourism"

type StudioTourism = { studioId:number; studioName:string; homeState:string; knownOrders:number; knownSales:number; outOfStateOrders:number; outOfStateSales:number; orderShare:number; salesShare:number; stateCount:number; unknownOrders:number; states:{state:string;orderCount:number;bookedSales:number}[]; zipCodes:{zipCode:string;state:string;orderCount:number;bookedSales:number;averageOrderValue:number}[] }
type Data = { studios: StudioTourism[] }
const money = new Intl.NumberFormat("en-US", { style:"currency", currency:"USD", maximumFractionDigits:0 })

function StudioTourismCard({ source }: { source: StudioTourism }) {
  const [excluded,setExcluded]=useState<string[]>([])
  const studio=applyStateExclusions(source,excluded)
  const toggle=(state:string)=>setExcluded(current=>current.includes(state)?current.filter(value=>value!==state):[...current,state])
  return <Card><CardContent className="space-y-5">
    <div><h2 className="flex items-center gap-2 text-lg font-semibold"><MapPinned className="size-5"/>{studio.studioName}</h2><p className="text-sm text-muted-foreground">Home state: {studio.homeState}</p></div>
    {source.states.length?<fieldset className="rounded-lg border p-3"><legend className="px-1 text-sm font-medium">Exclude neighboring states</legend><p className="mb-2 text-xs text-muted-foreground">Excluded states remain in ZIP-known totals but are treated like local-market orders, not tourism.</p><div className="flex flex-wrap gap-x-4 gap-y-2">{source.states.map(row=><label key={row.state} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={excluded.includes(row.state)} onChange={()=>toggle(row.state)}/><span>{row.state}</span><span className="text-xs text-muted-foreground">{row.orderCount.toLocaleString()} orders</span></label>)}</div>{excluded.length?<button type="button" className="mt-3 rounded border px-2 py-1 text-xs hover:bg-muted" onClick={()=>setExcluded([])}>Clear exclusions</button>:null}</fieldset>:null}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Out-of-state orders",studio.outOfStateOrders.toLocaleString(),`${studio.orderShare.toFixed(1)}% of ZIP-known orders`],["Out-of-state sales",money.format(studio.outOfStateSales),`${studio.salesShare.toFixed(1)}% of ZIP-known sales`],["Source states",studio.stateCount.toLocaleString(),excluded.length?`${excluded.join(", ")} excluded`:"Outside home state"],["ZIP-known orders",studio.knownOrders.toLocaleString(),studio.unknownOrders?`${studio.unknownOrders} unclassified orders excluded`:"All captured ZIPs classified"]].map(([label,value,detail])=><div key={label} className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p><p className="text-[11px] text-muted-foreground">{detail}</p></div>)}</div>
    <div><h3 className="mb-2 font-medium">Top out-of-state ZIP codes</h3>{studio.zipCodes.length?<ResponsiveContainer width="100%" height={Math.max(180,Math.min(300,studio.zipCodes.slice(0,10).length*30))}><BarChart data={studio.zipCodes.slice(0,10)} layout="vertical" margin={{left:0,right:16}}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" allowDecimals={false}/><YAxis type="category" dataKey="zipCode" width={52} tickLine={false} axisLine={false}/><Tooltip formatter={(value)=>[Number(value).toLocaleString(),"Orders"]} labelFormatter={(zip)=>`ZIP ${zip}`}/><Bar dataKey="orderCount" fill="var(--chart-1)" radius={[0,4,4,0]}/></BarChart></ResponsiveContainer>:<p className="py-12 text-center text-sm text-muted-foreground">No out-of-state orders after exclusions.</p>}</div>
    {studio.zipCodes.length?<div className="overflow-x-auto"><table className="w-full min-w-[520px] text-sm"><thead><tr className="border-b text-left"><th className="py-2">ZIP</th><th>State</th><th className="text-right">Orders</th><th className="text-right">Sales</th><th className="text-right">Avg. order</th></tr></thead><tbody>{studio.zipCodes.map(row=><tr key={row.zipCode} className="border-b last:border-0"><td className="py-2 font-medium">{row.zipCode}</td><td>{row.state}</td><td className="text-right">{row.orderCount.toLocaleString()}</td><td className="text-right">{money.format(row.bookedSales)}</td><td className="text-right">{money.format(row.averageOrderValue)}</td></tr>)}</tbody></table></div>:null}
  </CardContent></Card>
}

export function TourismDashboard() {
  const { selectedStudio, dateRange } = useApp()
  const [data,setData] = useState<Data|null>(null), [error,setError] = useState(""), [loading,setLoading] = useState(true)
  useEffect(() => { const controller=new AbortController(); Promise.resolve().then(()=>!controller.signal.aborted&&setLoading(true)); fetch(`/api/marketing/tourism?${new URLSearchParams({studioId:selectedStudio,startDate:dateRange.startDate,endDate:dateRange.endDate})}`,{signal:controller.signal}).then(async response=>{const body=await response.json();if(!response.ok)throw new Error(body.error);setData(body);setError("")}).catch(fetchError=>{if(fetchError.name!=="AbortError")setError(fetchError.message)}).finally(()=>!controller.signal.aborted&&setLoading(false)); return()=>controller.abort() },[selectedStudio,dateRange.startDate,dateRange.endDate])
  return <div className="space-y-6">
    <Link href="/marketing" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4"/>Marketing</Link>
    <DashboardToolbar title="Tourism indicators" subtitle="Out-of-state purchasing patterns by studio, based on captured billing ZIP codes." defaultPreset="custom" />
    <Card><CardContent className="text-sm text-muted-foreground"><p><strong className="text-foreground">How to read this:</strong> An order is out of state when its billing ZIP maps to a different state than the studio. This is a tourism indicator, not a guest or seat count; one order may contain multiple seats, and travelers may use an in-state billing address.</p></CardContent></Card>
    {loading?<Skeleton className="h-80"/>:error?<Card><CardContent className="py-12 text-center">{error}</CardContent></Card>:<div className="grid items-start gap-5 xl:grid-cols-2">{data?.studios.map(studio=><StudioTourismCard key={studio.studioId} source={studio}/>)}</div>}
  </div>
}
