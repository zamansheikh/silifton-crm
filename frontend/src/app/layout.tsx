import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Silifton CRM",
  description: "Project + time management workspace for a software studio.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      data-accent="violet"
      data-density="comfortable"
      data-sidebar="expanded"
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@300..700&family=Geist+Mono:wght@400..600&family=Inter+Tight:wght@400..800&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
