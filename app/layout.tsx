import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "IRÜ FoodFlow - Eğitim Mutfağı Yönetim Sistemi",
  description: "İstanbul Rumeli Üniversitesi Eğitim Mutfağı Yönetim ve Talep Sistemi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${inter.variable} font-geist antialiased bg-gray-50`}>
        {children}
      </body>
    </html>
  );
}
