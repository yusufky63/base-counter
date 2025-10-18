import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ThemeProvider } from "./context/ThemeContext";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Base Counter",
  description: "An on-chain counter app powered by Base blockchain.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
        {/* OpenGraph & Twitter Meta Tags */}
        <meta property="og:title" content="Base Counter" />
        <meta
          property="og:description"
          content="On-chain counter mini-app for Base."
        />
        <meta
          property="og:image"
          content="https://counter-base.vercel.app/og-image.png"
        />
        <meta property="og:url" content="https://counter-base.vercel.app/" />
        <meta name="twitter:card" content="summary_large_image" />
        {/* Farcaster Mini App Embed Meta - Base Compatible */}
        <meta
          name="fc:miniapp"
          content='{"version":"1","imageUrl":"https://counter-base.vercel.app/og-image.png","button":{"title":"🚀 Increment Counter","action":{"type":"launch_miniapp","name":"Base Counter","url":"https://counter-base.vercel.app","splashImageUrl":"https://counter-base.vercel.app/splash.png","splashBackgroundColor":"#FFFFFF"}}}'
        />
        {/* Frame compatibility */}
        <meta
          name="fc:frame"
          content='{"version":"1","imageUrl":"https://counter-base.vercel.app/og-image.png","button":{"title":"🚀 Increment Counter","action":{"type":"launch_frame","name":"Base Counter","url":"https://counter-base.vercel.app","splashImageUrl":"https://counter-base.vercel.app/splash.png","splashBackgroundColor":"#FFFFFF"}}}'
        />
      </head>
      <body>
        <Providers>
          <ThemeProvider>
            {children}
            <Toaster position="top-center" />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
