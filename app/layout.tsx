import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "./_components/site-header";

export const metadata: Metadata = {
  title: "Hackathon App",
  description: "Next.js + Supabase auth starter",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen bg-[radial-gradient(60%_80%_at_20%_10%,rgba(0,0,0,0.10),transparent_60%),radial-gradient(60%_80%_at_80%_0%,rgba(0,0,0,0.08),transparent_55%)]">
          <SiteHeader />
          {children}
        </div>
      </body>
    </html>
  );
}
