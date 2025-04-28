import type { Metadata } from "next";
import "./globals.css";
import { Home, Plus, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white">
        <header className="fixed top-0 left-0 right-0 h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-center gap-4 z-50">
          <Link href="/">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-gray-800"
            >
              <Home className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/add">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-gray-800"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/review">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-gray-800"
            >
              <BookOpen className="h-5 w-5" />
            </Button>
          </Link>
        </header>
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}
