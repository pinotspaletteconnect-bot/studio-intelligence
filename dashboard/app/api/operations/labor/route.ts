import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { apiAccessResponse, assertStudioAccess, requireApiAccess } from "@/lib/auth/api"
import { getHomebaseLabor } from "@/lib/services/homebase-labor"

const schema = z.object({ studioId:z.string().max(100).optional(), startDate:z.iso.date(), endDate:z.iso.date() })
export async function GET(request: NextRequest) {
  const parsed=schema.safeParse(Object.fromEntries(request.nextUrl.searchParams)); if(!parsed.success) return NextResponse.json({error:"Invalid labor date range."},{status:400})
  try { const access=await requireApiAccess(); assertStudioAccess(access,parsed.data.studioId); return NextResponse.json(await getHomebaseLabor(parsed.data.studioId,parsed.data.startDate,parsed.data.endDate,access.allowedStudioIds)) }
  catch(error){ const response=apiAccessResponse(error); if(response)return response; console.error("Homebase labor reporting failed",error); return NextResponse.json({error:"Labor reporting is temporarily unavailable."},{status:500}) }
}
