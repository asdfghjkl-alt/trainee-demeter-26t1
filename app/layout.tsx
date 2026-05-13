import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Rendezvous",
  description: "Find the fairest place to meet.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full flex flex-col text-gray-900 bg-white dark:text-gray-100 dark:bg-[#0a0a0a] font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Toaster position="top-center" />
          <Providers>
            <Navbar />
            <div className="flex-1 flex flex-col">{children}</div>
            <Footer />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
