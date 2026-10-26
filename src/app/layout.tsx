import type { Metadata } from "next";
import { Bebas_Neue, Geist, Geist_Mono, Pirata_One } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Placeholder display fonts, see --font-display in globals.css: blackletter for
// the Metal Atlas, a poster face for the Rock Atlas.
const pirata = Pirata_One({
  variable: "--font-pirata",
  subsets: ["latin"],
  weight: "400",
});

const bebas = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Metal Atlas & Rock Atlas",
  description:
    "Two guides to loud music: explore metal subgenres and rock styles, one card at a time.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${pirata.variable} ${bebas.variable} h-full antialiased`}
    >
      {process.env.NEXT_PUBLIC_META_CSP && (
        <head>
          <meta
            httpEquiv="Content-Security-Policy"
            content={process.env.NEXT_PUBLIC_META_CSP}
          />
        </head>
      )}
      <body className="flex min-h-full flex-col bg-black text-gray-100">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
