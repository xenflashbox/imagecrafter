/**
 * The share card for /p/[id] — the customer's own portrait, not the generic
 * house card.
 *
 * Composed rather than served raw: feed previews crop to roughly 1.91:1, and a
 * centre-crop of a 3:4 portrait cuts the face in half. Here the art sits in a
 * fixed right-hand panel anchored to the top of the frame, so the face
 * survives whatever the platform does to the rest.
 */

import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A portrait painted from a single photograph on ImageCrafter";

const ART_W = 472; // 0.75 aspect at full height — matches the 900x1200 source
const PAD = 72;

const CANVAS = "#faf7f2";
const INK = "#1c1714";
const INK_MUTED = "rgba(28, 23, 20, 0.78)";
const ACCENT = "#a4442a";

export default async function Image({ params }: { params: { id: string } }) {
  const portrait = await prisma.portrait.findUnique({
    where: { id: params.id },
    select: { previewImageUrl: true, status: true },
  });

  const art =
    portrait && ["preview", "purchased"].includes(portrait.status)
      ? portrait.previewImageUrl
      : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: CANVAS,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            padding: PAD,
          }}
        >
          <div
            style={{
              fontSize: 19,
              fontWeight: 700,
              letterSpacing: 5.5,
              color: ACCENT,
            }}
          >
            IMAGECRAFTER
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 40,
              fontSize: 58,
              fontWeight: 700,
              lineHeight: 1.12,
              color: INK,
            }}
          >
            <span>Painted from</span>
            <span>a single</span>
            <span>photograph.</span>
          </div>
          <div
            style={{
              width: 64,
              height: 3,
              marginTop: 40,
              backgroundColor: ACCENT,
            }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 28,
              fontSize: 23,
              color: INK_MUTED,
              lineHeight: 1.35,
            }}
          >
            <span>Your pet or one person, as a</span>
            <span>museum-quality portrait. Free to try.</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            width: ART_W,
            height: "100%",
            borderLeft: `2px solid rgba(164, 68, 42, 0.38)`,
            backgroundColor: "#f2ece2",
          }}
        >
          {art && (
            <img
              src={art}
              width={ART_W}
              height={size.height}
              style={{
                width: ART_W,
                height: size.height,
                objectFit: "cover",
                objectPosition: "top",
              }}
            />
          )}
        </div>
      </div>
    ),
    size,
  );
}
