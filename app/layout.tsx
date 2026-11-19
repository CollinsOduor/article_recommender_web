import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Next Article | Reader recommendations",
  description: "Personalized article recommendations based on recent reading.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
