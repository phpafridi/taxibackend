'use client';

import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";

//import custom components
import ClientWrapper from "../components/common/ClientWrapper";

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/scrollbar";
import { Toaster } from "sonner";
// import main theme scss
import "../../styles/theme.scss";
import { SessionProvider } from "next-auth/react";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

// Create metadata outside the component since it's a client component

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClientWrapper>
      <html lang="en" className="expanded">
        <head>
          {/* Icons */}
          <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
          <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
          <link rel="shortcut icon" href="/favicon.ico" />

          {/* Viewport for mobile, incl. iPhone notch support */}
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />

          <meta name="format-detection" content="telephone=no" />
        </head>
        <body className={`${publicSans.variable}`}>
          <SessionProvider>
            {children}
            <Toaster richColors position="top-right" />
          </SessionProvider>
        </body>
      </html>
    </ClientWrapper>
  );
}