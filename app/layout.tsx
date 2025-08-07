import type { Metadata } from "next";
import { Hanuman, Inter } from "next/font/google";
import "./globals.css";

const hanuman = Hanuman({
  weight: ['100', '300', '400', '700', '900'],
  subsets: ["khmer", "latin"],
  display: 'swap',
  variable: "--font-hanuman",
});

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Humanitarian Report System",
  description: "A comprehensive humanitarian report generation and management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${hanuman.variable} ${inter.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
