/**
 * The ImageCrafter mark: an altarpiece arch split down the middle, photograph
 * on the left, painting on the right.
 *
 * Fixed hexes are correct here and nowhere else. A logo has to be the same
 * object on the storefront, in the browser tab, on the Stripe payment page and
 * in Clerk, so it cannot follow the page's theme tokens. This file is the
 * on-page twin of public/icon.svg — change one and change the other.
 */
export function ArchMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={className}
      role="img"
      aria-label="ImageCrafter"
    >
      <defs>
        <clipPath id="arch-mark-clip">
          <path d="M168 400 L168 200 A88 88 0 0 1 344 200 L344 400 Z" />
        </clipPath>
        <linearGradient id="arch-mark-gild" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9a45c" />
          <stop offset="1" stopColor="#a4442a" />
        </linearGradient>
      </defs>

      <rect width="512" height="512" rx="114" fill="#1c1714" />

      <g clipPath="url(#arch-mark-clip)">
        <rect x="160" y="96" width="96" height="320" fill="#faf7f2" />
        <rect x="256" y="96" width="96" height="320" fill="#c1873f" />
        <path
          d="M256 198 Q292 178 320 197 Q339 209 352 199 L352 416 L256 416 Z"
          fill="#a4442a"
        />
        <path
          d="M256 302 Q288 285 316 301 Q337 313 352 303 L352 416 L256 416 Z"
          fill="#7e3420"
        />
      </g>

      <path
        d="M168 400 L168 200 A88 88 0 0 1 344 200 L344 400 Z"
        fill="none"
        stroke="url(#arch-mark-gild)"
        strokeWidth="7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
