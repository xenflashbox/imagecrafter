import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  // Marketing & auth
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",

  // SEO metadata routes (must bypass auth)
  "/robots.txt",
  "/sitemap.xml",
  "/site.webmanifest",

  // Health checks (public — used by guardrails verify.sh). Sub-routes carry
  // their own Bearer CRON_SECRET check; auth.protect() would 404 them.
  "/api/health(.*)",

  // Webhooks (must remain public)
  "/api/webhooks/(.*)",

  // Cron jobs — no Clerk session exists, so auth.protect() would 404 the
  // scheduler. Each route enforces its own Bearer CRON_SECRET check.
  "/api/cron/(.*)",

  // Portrait Studio — guest purchase flow (no auth required)
  "/portraits(.*)",
  "/api/portraits/(.*)",
  "/api/orders/(.*)",
  "/api/print/(.*)",

  // Stripe-sourced amounts for client components. Public: guests see prices
  // before they ever sign in.
  "/api/pricing",

  // Credit packs — routes enforce their own auth policy (guest balance=0,
  // guest checkout → sign-in redirect). auth.protect() would 404 guests.
  "/api/credits",
  "/api/packs/(.*)",

  // Blog (public content — fetched from Payload CMS)
  "/blog(.*)",

  // Newsletter subscription (public)
  "/api/newsletter(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
