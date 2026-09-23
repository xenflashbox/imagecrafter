import { getAuthorAvatar, type PayloadAuthor } from "@/lib/payload";

/**
 * Author avatars come from environmental portraits where the face is a small
 * part of the frame, so a plain object-cover square is unreadable at 32px. The
 * image is scaled up and shifted so the CMS focal point lands in the centre of
 * the circle.
 */
export function AuthorAvatar({
  author,
  size,
  zoom = 1.47,
  className = "",
}: {
  author?: PayloadAuthor | string | null;
  size: number;
  zoom?: number;
  className?: string;
}) {
  const avatar = getAuthorAvatar(author);
  if (!avatar) return null;

  const scale = zoom * 100;

  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden rounded-full bg-surface ring-1 ring-rim ${className}`}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatar.url}
        alt={avatar.alt}
        width={size}
        height={size}
        loading="lazy"
        className="absolute max-w-none"
        style={{
          width: `${scale}%`,
          height: `${scale}%`,
          left: `${50 - avatar.focalX * zoom}%`,
          top: `${50 - avatar.focalY * zoom}%`,
        }}
      />
    </span>
  );
}
