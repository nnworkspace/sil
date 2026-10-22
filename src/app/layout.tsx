import type { Metadata } from "next";
import { Assistant, EB_Garamond } from "next/font/google";
import "./globals.css";

import { currentUser } from "@/auth";
import { DemoBanner } from "@/components/demo-banner";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { isDemoMode } from "@/lib/demo";

// Body font: Assistant. Heading and brand font: EB Garamond at the regular
// weight (400). See ADR-0007.
const assistant = Assistant({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-eb-garamond",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sil · Silhouettes, Styled in Loop",
  description:
    "A curated collection: every piece catalogued, styled, and stowed.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The header (with nav + sign-out) only shows to the signed-in owner; the
  // sign-in page renders bare (#119). In demo mode (local demos only) the
  // owner is the fixed demo identity and every page says so.
  const user = await currentUser();
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${assistant.variable} ${ebGaramond.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {isDemoMode() ? <DemoBanner /> : null}
          {user ? <SiteHeader user={user} /> : null}
          <main className="flex-1">{children}</main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
