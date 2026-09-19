import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing confirmation code" }, { status: 400 });
  }

  const request = await prisma.dataDeletionRequest.findUnique({
    where: { confirmationCode: code },
    select: {
      confirmationCode: true,
      status: true,
      platform: true,
      requestedAt: true,
      completedAt: true,
      errorMessage: true,
    },
  });

  if (!request) {
    return NextResponse.json({ error: "No deletion request found for that code" }, { status: 404 });
  }

  return NextResponse.json({
    confirmation_code: request.confirmationCode,
    status: request.status,
    platform: request.platform,
    requested_at: request.requestedAt,
    completed_at: request.completedAt,
    error_message: request.errorMessage,
  });
}
