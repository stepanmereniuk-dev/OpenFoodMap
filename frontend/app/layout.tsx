import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Open Food Facts Map",
  description: "Carte OpenStreetMap pour explorer les lieux alimentaires.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <head>
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/off-css/app-ltr.css?v=1779800845" />
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/off-css/jquery-ui.css" />
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/off-css/select2.min.css" />
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/leaflet/leaflet.css" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
