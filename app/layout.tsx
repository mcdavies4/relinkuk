import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relink — WhatsApp-first delivery recovery",
  description: "Courier operators and ecommerce merchants resolve failed deliveries via WhatsApp in under 60 seconds — before the driver leaves the street.",
  keywords: ["delivery recovery", "WhatsApp", "courier", "failed delivery", "last mile"],
  authors: [{ name: "The 36th Company" }],
  metadataBase: new URL("https://relinkuk.vercel.app"),
  openGraph: {
    title: "Relink — WhatsApp-first delivery recovery",
    description: "Resolve failed deliveries via WhatsApp in under 60 seconds.",
    type: "website",
    url: "https://relinkuk.vercel.app",
    siteName: "Relink",
  },
  twitter: {
    card: "summary",
    title: "Relink — WhatsApp-first delivery recovery",
    description: "Resolve failed deliveries via WhatsApp in under 60 seconds.",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
