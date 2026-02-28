import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  // Marketing & auth
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",

  // Health check (public — used by guardrails verify.sh)
  "/api/health",

  // Webhooks (must remain public)
  "/api/webhooks/(.*)",

  // Portrait Studio — guest purchase flow (no auth required)
  "/portraits(.*)",
  "/api/portraits/(.*)",
  "/api/orders/(.*)",
  "/api/print/(.*)",

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
