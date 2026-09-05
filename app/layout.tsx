import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../components/auth-provider";
import { ProfileProvider } from "../components/profile-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gold AI — Ask naturally. Learn intelligently.",
  description: "Gold AI is a simple AI companion for learning, research, writing and more.",
  icons: {
    icon: "/images/logo1.png",
    shortcut: "/images/logo1.png",
    apple: "/images/logo1.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body><AuthProvider><ProfileProvider>{children}</ProfileProvider></AuthProvider></body>
    </html>
  );
}
