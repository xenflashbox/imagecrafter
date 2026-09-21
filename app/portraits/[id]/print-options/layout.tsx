import { redirect } from "next/navigation";
import { printCheckoutEnabled } from "@/lib/launch-flags";

export default async function PrintOptionsLayout({ children, params }: {
  children: React.ReactNode; params: Promise<{ id: string }>;
}) {
  if (!printCheckoutEnabled()) redirect(`/portraits/${(await params).id}/preview`);
  return children;
}
