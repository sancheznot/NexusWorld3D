import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthSessionProvider from "@/components/providers/AuthSessionProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appTitle =
  process.env.NEXT_PUBLIC_GAME_NAME ?? "NexusWorld3D";
const appDescription =
  process.env.NEXT_PUBLIC_GAME_DESCRIPTION ??
  "Framework para mundos 2D/3D multijugador en el navegador.";

export const metadata: Metadata = {
  title: `${appTitle} — NexusWorld3D`,
  description: appDescription,
};

/** ES/EN: Mobile-first, notch/safe-area, horizontal play in browser. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f172a",
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
        suppressHydrationWarning={true}
      >
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
