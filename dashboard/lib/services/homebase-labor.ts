import "server-only"
import { supabase } from "@/lib/supabase/server"

type RoleRow={studio_id:number;studio_name:string;labor_date:string;role_name:string;labor_category:"cogs"|"overhead"|"unmapped";scheduled_hours:number|string|null;actual_hours:number|string|null;scheduled_cost:number|string|null;actual_cost:number|string|null;total_sales:number|string|null;is_daily_fallback:boolean;reconciliation_note:string|null;reconciliation_resolution:string|null}
const num=(value:unknown)=>Number.isFinite(Number(value??0))?Number(value??0):0

export async function getHomebaseLabor(studioId:string|undefined,startDate:string,endDate:string,allowedStudioIds:number[]){
  let query=supabase.from("homebase_labor_role_reporting").select("studio_id,studio_name,labor_date,role_name,labor_category,scheduled_hours,actual_hours,scheduled_cost,actual_cost,total_sales,is_daily_fallback,reconciliation_note,reconciliation_resolution").gte("labor_date",startDate).lte("labor_date",endDate).order("labor_date")
  query=studioId&&studioId!=="all"?query.eq("studio_id",studioId):query.in("studio_id",allowedStudioIds)
  const result=await query
  if(result.error)throw result.error
  const roles=((result.data??[]) as RoleRow[]).map(r=>({...r,scheduledHours:num(r.scheduled_hours),actualHours:num(r.actual_hours),scheduledCost:num(r.scheduled_cost),actualCost:num(r.actual_cost),totalSales:num(r.total_sales)}))
  const grouped=new Map<string,{studioId:number;studioName:string;date:string;totalSales:number;cogsHours:number;overheadHours:number;unmappedHours:number;cogsCost:number;overheadCost:number;unmappedCost:number;scheduledHours:number;scheduledCost:number}>()
  for(const r of roles){const key=`${r.studio_id}:${r.labor_date}`;const d=grouped.get(key)??{studioId:r.studio_id,studioName:r.studio_name,date:r.labor_date,totalSales:r.totalSales,cogsHours:0,overheadHours:0,unmappedHours:0,cogsCost:0,overheadCost:0,unmappedCost:0,scheduledHours:0,scheduledCost:0};d.scheduledHours+=r.scheduledHours;d.scheduledCost+=r.scheduledCost;if(r.labor_category==="cogs"){d.cogsHours+=r.actualHours;d.cogsCost+=r.actualCost}else if(r.labor_category==="overhead"){d.overheadHours+=r.actualHours;d.overheadCost+=r.actualCost}else{d.unmappedHours+=r.actualHours;d.unmappedCost+=r.actualCost}grouped.set(key,d)}
  const daily=[...grouped.values()].map(d=>{const totalCost=d.cogsCost+d.overheadCost+d.unmappedCost;return{...d,totalCost,actualHours:d.cogsHours+d.overheadHours+d.unmappedHours,cogsPercent:d.totalSales>0?d.cogsCost/d.totalSales*100:null,overheadPercent:d.totalSales>0?d.overheadCost/d.totalSales*100:null,totalPercent:d.totalSales>0?totalCost/d.totalSales*100:null}})
  const totalSales=daily.reduce((s,d)=>s+d.totalSales,0),cogsCost=daily.reduce((s,d)=>s+d.cogsCost,0),overheadCost=daily.reduce((s,d)=>s+d.overheadCost,0),unmappedCost=daily.reduce((s,d)=>s+d.unmappedCost,0),totalCost=cogsCost+overheadCost+unmappedCost
  return{startDate,endDate,totals:{totalSales,cogsCost,overheadCost,unmappedCost,totalCost,actualHours:daily.reduce((s,d)=>s+d.actualHours,0),scheduledHours:daily.reduce((s,d)=>s+d.scheduledHours,0),cogsPercent:totalSales>0?cogsCost/totalSales*100:null,overheadPercent:totalSales>0?overheadCost/totalSales*100:null,totalPercent:totalSales>0?totalCost/totalSales*100:null},daily,roles}
}
