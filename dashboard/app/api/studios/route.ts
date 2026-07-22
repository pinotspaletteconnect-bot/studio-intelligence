import { NextResponse } from "next/server";
import { getStudios } from "@/lib/services/studios";

export async function GET() {
  try {
    const studios = await getStudios();

    return NextResponse.json(studios);
  } catch (error) {
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