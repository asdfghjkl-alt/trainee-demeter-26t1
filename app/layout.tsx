import type { Metadata } from "next";
import { headers } from "next/headers";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read the nonce injected by the middleware (proxy.ts) via the x-nonce
  // request header. Next.js uses this to stamp inline hydration scripts with
  // the correct nonce so they pass the strict CSP in production.
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <head>
        {/* Expose the nonce to Next.js internals — this is the hook Next.js
            uses to find and stamp the nonce onto its generated inline scripts */}
        {nonce && (
          <meta name="next-nonce" content={nonce} />
        )}
      </head>
      <body className="min-h-full flex flex-col text-gray-900 bg-white dark:text-gray-100 dark:bg-[#0a0a0a] font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem nonce={nonce}>
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
