import { Geist } from "next/font/google";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "PTO Planner - Plan Your Time Off",
  description: "A tool to help you plan and optimize your PTO days throughout the year",
};

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geistSans.className} suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased">
        <main className="relative flex min-h-screen flex-col items-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_60%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,hsl(var(--secondary)/0.18),transparent_65%)]" />
          <div className="relative z-10 flex w-full flex-1 flex-col items-center">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
