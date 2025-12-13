import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ImageCrafter - AI Image Generation Made Simple",
  description:
    "Create stunning AI images without learning complex prompts. Smart templates, character consistency, and professional results every time.",
  keywords: [
    "AI image generation",
    "text to image",
    "AI art",
    "image creator",
    "children's book illustrations",
    "blog images",
  ],
  authors: [{ name: "Xenco Labs" }],
  openGraph: {
    title: "ImageCrafter - AI Image Generation Made Simple",
    description:
      "Create stunning AI images without learning complex prompts. Smart templates and professional results.",
    url: "https://imagecrafter.app",
    siteName: "ImageCrafter",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ImageCrafter - AI Image Generation Made Simple",
    description: "Create stunning AI images without learning complex prompts.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className={`${inter.variable} font-sans antialiased`}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
