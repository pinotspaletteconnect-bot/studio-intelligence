"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export type UnmappedLaborEntry = { studio_id:number; studio_name:string; labor_date:string; role_name:string; actualHours:number; actualCost:number }
const money=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"})
const date=new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"})

export function UnmappedLaborReconciliation({entries}:{entries:UnmappedLaborEntry[]}){
  const[savingKey,setSavingKey]=useState<string|null>(null)
  const[error,setError]=useState<{key:string;text:string}|null>(null)
  const[roleOptions,setRoleOptions]=useState<string[]>([])
  const editableEntries=entries.filter(entry=>!entry.role_name)
  useEffect(()=>{fetch("/api/settings/homebase-roles").then(async response=>{const result=await response.json();if(!response.ok)throw new Error(result.error);setRoleOptions((result.roles??[]).map((role:{role_name:string})=>role.role_name).filter(Boolean))}).catch(()=>setRoleOptions([]))},[])
  async function save(event:React.FormEvent<HTMLFormElement>,entry:UnmappedLaborEntry){event.preventDefault();const key=`${entry.studio_id}-${entry.labor_date}`;const roleName=String(new FormData(event.currentTarget).get("roleName")??"").trim();setSavingKey(key);setError(null);try{const response=await fetch("/api/operations/labor-reconciliation",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({studioId:entry.studio_id,laborDate:entry.labor_date,resolution:"assign_role",roleName,actualHours:entry.actualHours,actualCost:entry.actualCost})});const result=await response.json();if(!response.ok)throw new Error(result.error);window.location.reload()}catch(saveError){setError({key,text:saveError instanceof Error?saveError.message:"Unable to save the Homebase role."})}finally{setSavingKey(null)}}
  if(!editableEntries.length)return null
  return <div className="mt-3 space-y-2">{editableEntries.map(entry=>{const key=`${entry.studio_id}-${entry.labor_date}`;return <form key={key} onSubmit={event=>save(event,entry)} className="grid gap-3 rounded-lg border p-3 text-sm md:grid-cols-[140px_1fr_100px_120px_minmax(220px,1.5fr)_auto] md:items-end"><div><span className="block text-xs text-muted-foreground">Date</span>{date.format(new Date(`${entry.labor_date}T00:00:00Z`))}</div><div><span className="block text-xs text-muted-foreground">Studio</span>{entry.studio_name}</div><div><span className="block text-xs text-muted-foreground">Hours</span>{entry.actualHours.toFixed(2)}</div><div><span className="block text-xs text-muted-foreground">Cost</span>{money.format(entry.actualCost)}</div><label><span className="block text-xs text-muted-foreground">Homebase role</span><Input name="roleName" list="homebase-role-options" placeholder="Select or enter role" required/><datalist id="homebase-role-options">{roleOptions.map(role=><option key={role} value={role}/>)}</datalist></label><Button type="submit" size="sm" disabled={savingKey===key}>{savingKey===key?"Saving…":"Save role"}</Button>{error?.key===key?<p role="alert" className="text-destructive md:col-span-6">{error.text}</p>:null}</form>})}</div>
}
