import { NextResponse } from "next/server";
import { getStudios } from "@/lib/services/studios";
import { apiAccessResponse, requireApiAccess } from "@/lib/auth/api";

export async function GET() {
  try {
    const access = await requireApiAccess();
    const studios = await getStudios(access.allowedStudioIds);

    return NextResponse.json(studios);
  } catch (error) {
    const accessResponse = apiAccessResponse(error)
    if (accessResponse) return accessResponse
    console.error(error);

    return NextResponse.json(
      {
        error: "Unable to load studios.",
      },
      {
        status: 500,
      }
    );
  }
}
