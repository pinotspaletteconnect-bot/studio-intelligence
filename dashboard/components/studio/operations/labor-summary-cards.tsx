"use client"
import Link from "next/link"
import {useEffect,useState} from "react"
import {Clock3} from "lucide-react"
import {useApp} from "@/contexts/app-context"
import {Card,CardContent} from "@/components/ui/card"
type Totals={totalCost:number;cogsCost:number;overheadCost:number;unmappedCost:number;totalPercent:number|null;cogsPercent:number|null;overheadPercent:number|null}
const money=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}),pct=(v:number|null)=>v===null?"N/A":`${v.toFixed(1)}% of sales`
export function LaborSummaryCards(){const{selectedStudio,dateRange}=useApp();const[data,setData]=useState<Totals|null>(null);useEffect(()=>{const c=new AbortController();fetch(`/api/operations/labor?${new URLSearchParams({studioId:selectedStudio,startDate:dateRange.startDate,endDate:dateRange.endDate})}`,{signal:c.signal}).then(r=>r.ok?r.json():null).then(r=>setData(r?.totals??null)).catch(()=>null);return()=>c.abort()},[selectedStudio,dateRange.startDate,dateRange.endDate]);if(!data)return null;return <div className="grid gap-4 sm:grid-cols-3">{[["Total labor",data.totalCost,data.totalPercent],["COGS labor",data.cogsCost,data.cogsPercent],["Overhead labor",data.overheadCost,data.overheadPercent]].map(([label,value,percent])=><Link href="/operations/labor" key={String(label)}><Card className="h-full transition-colors hover:border-primary/50"><CardContent><div className="flex justify-between"><p className="text-sm text-muted-foreground">{label}</p><Clock3 className="size-4 text-primary"/></div><p className="mt-2 text-2xl font-semibold">{money.format(Number(value))}</p><p className="text-xs text-muted-foreground">{pct(percent as number|null)}</p></CardContent></Card></Link>)}</div>}
