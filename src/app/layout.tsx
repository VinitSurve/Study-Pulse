import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistration } from "@/components/providers/sw-registration";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudyPulse",
  description: "Track your study sessions. Start fast, stay focused.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "StudyPulse",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f1117",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-dvh flex flex-col bg-bg text-text-primary font-sans">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
