import type { Metadata } from "next";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return <><SiteHeader />{children}<SiteFooter /></>;
}
