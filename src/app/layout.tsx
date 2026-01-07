import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NetworkGuard from "@/components/NetworkGuard";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "FairTicket | Trustless Blockchain Ticketing",
  description: "Secure, fraud-proof ticketing built on Polygon. Eliminate scalping and duplication with cryptographic proof of ownership.",
  keywords: ["blockchain", "ticketing", "nft", "polygon", "fraud-prevention", "university events"],
  authors: [{ name: "FairTicket Team" }],
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NetworkGuard>
          {children}
        </NetworkGuard>
        <Toaster position="bottom-right" theme="dark" />
      </body>
    </html>
  );
}
