/**
 * POST /api/images/requests/[id]/select
 *
 * Persist the user's side-by-side pick for a dual GenerationRequest.
 * Body: { imageId: string }
 *
 * Ownership is enforced in the service layer (request must belong to the
 * caller; image must belong to the request).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { selectWinnerImage } from "@/lib/services/image-generation";

const selectSchema = z.object({
  imageId: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: requestId } = await params;

    const body = await request.json().catch(() => null);
    const parsed = selectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const result = await selectWinnerImage(
      userId,
      requestId,
      parsed.data.imageId
    );

    if (!result.success) {
      const status = result.error === "Generation request not found" ? 404 : 400;
      return NextResponse.json(
        { success: false, error: result.error },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      requestId: result.requestId,
      selectedImageId: result.selectedImageId,
    });
  } catch (error) {
    console.error("Select winner error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
