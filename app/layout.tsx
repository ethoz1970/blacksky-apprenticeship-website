import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blacksky Apprenticeship Program",
  description:
    "A free, hands-on apprenticeship program in media, technology, business, and the arts. No tuition. No prerequisites. Just the oldest model of learning — brought into the future.",
  openGraph: {
    title: "Blacksky Apprenticeship Program",
    description: "Free apprenticeships in media, tech, business, and the arts.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
