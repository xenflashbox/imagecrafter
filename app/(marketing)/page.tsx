"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

/**
 * A/B Test Landing Page Router
 * 
 * This component randomly assigns visitors to one of two landing page variants
 * and persists the assignment in localStorage to ensure consistent experience.
 * 
 * Variants:
 * - A: "Prompt Frustration" - Hooks on the pain of complex prompt engineering
 * - B: "Generic AI Look" - Hooks on embarrassingly obvious AI-generated images
 * 
 * To force a specific variant for testing:
 * - Add ?variant=a or ?variant=b to the URL
 * 
 * Analytics tracking:
 * - The variant is stored in localStorage as 'imagecrafter_ab_variant'
 * - Include this value in your signup/conversion events
 */

// Dynamic imports for code splitting
const LandingPageVariantA = dynamic(() => import("./landing-a/page"), {
  loading: () => <LoadingScreen />,
});

const LandingPageVariantB = dynamic(() => import("./landing-b/page"), {
  loading: () => <LoadingScreen />,
});

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

type Variant = "a" | "b";

function ABTestRouter() {
  const searchParams = useSearchParams();
  const [variant, setVariant] = useState<Variant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for forced variant in URL
    const forcedVariant = searchParams.get("variant") as Variant | null;
    
    if (forcedVariant === "a" || forcedVariant === "b") {
      setVariant(forcedVariant);
      localStorage.setItem("imagecrafter_ab_variant", forcedVariant);
      trackVariantAssignment(forcedVariant, true);
      setIsLoading(false);
      return;
    }

    // Check for existing assignment
    const existingVariant = localStorage.getItem("imagecrafter_ab_variant") as Variant | null;
    
    if (existingVariant === "a" || existingVariant === "b") {
      setVariant(existingVariant);
      setIsLoading(false);
      return;
    }

    // Randomly assign new variant (50/50 split)
    const newVariant: Variant = Math.random() < 0.5 ? "a" : "b";
    localStorage.setItem("imagecrafter_ab_variant", newVariant);
    setVariant(newVariant);
    trackVariantAssignment(newVariant, false);
    setIsLoading(false);
  }, [searchParams]);

  // Track variant assignment (integrate with your analytics)
  const trackVariantAssignment = (variant: Variant, wasForced: boolean) => {
    // Send to your analytics service
    if (typeof window !== "undefined") {
      // PostHog example:
      // window.posthog?.capture('ab_variant_assigned', {
      //   variant,
      //   experiment: 'landing_page_v1',
      //   forced: wasForced,
      // });

      // Google Analytics example:
      // window.gtag?.('event', 'ab_variant_assigned', {
      //   variant,
      //   experiment: 'landing_page_v1',
      //   forced: wasForced,
      // });

      // Console log for development
      console.log(`[A/B Test] Assigned to variant ${variant.toUpperCase()}${wasForced ? ' (forced)' : ''}`);
    }
  };

  // Show loading while determining variant
  if (isLoading || !variant) {
    return <LoadingScreen />;
  }

  // Render the assigned variant
  return variant === "a" ? <LandingPageVariantA /> : <LandingPageVariantB />;
}

// Wrap in Suspense for useSearchParams
export default function LandingPageRouter() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ABTestRouter />
    </Suspense>
  );
}
