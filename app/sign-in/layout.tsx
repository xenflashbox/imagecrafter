import type { Metadata } from "next";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return <><SiteHeader />{children}<SiteFooter /></>;
}
