import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blacksky Up",
  description:
    "Up is for everyone. Blacksky Up is a free apprenticeship program in media, technology, business, and the arts. No tuition. No prerequisites. The oldest model of learning — built for the future.",
  openGraph: {
    title: "Blacksky Up",
    description: "Up is for everyone. Free apprenticeships in media, tech, business, and the arts.",
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
