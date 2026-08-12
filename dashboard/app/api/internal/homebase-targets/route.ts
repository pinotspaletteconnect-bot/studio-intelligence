import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/server"

export const runtime = "nodejs"

function authorized(request: Request) {
  const expected=process.env.HOMEBASE_SECRET_BROKER_TOKEN??process.env.PTS_SECRET_BROKER_TOKEN
  const actual=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"")??""
  if(!expected)return false; const a=Buffer.from(expected),b=Buffer.from(actual); return a.length===b.length&&timingSafeEqual(a,b)
}
export async function GET(request:Request){
  if(!authorized(request))return NextResponse.json({error:"Unauthorized"},{status:401})
  const status = new URL(request.url).searchParams.get("status") ?? "validated"
  if (!['validated', 'pending'].includes(status)) return NextResponse.json({ error: "Invalid target status" }, { status: 400 })
  let query = supabase.from("homebase_collection_targets").select("account_id,organization_id,studio_id,studio_code,studio_name,timezone,location_uuid,location_name").order("account_id")
  query = status === "pending" ? query.is("location_uuid", null) : query.not("location_uuid", "is", null)
  const {data,error}=await query
  if(error)return NextResponse.json({error:"Targets unavailable"},{status:500})
  return NextResponse.json({targets:data??[]},{headers:{"Cache-Control":"no-store, private"}})
}
