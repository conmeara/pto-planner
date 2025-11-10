import { Nunito, PT_Serif, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "PTO Planner - Plan Your Time Off",
  description: "A tool to help you plan and optimize your PTO days throughout the year",
};

const nunito = Nunito({
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-nunito",
});

const ptSerif = PT_Serif({
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-pt-serif",
});

const geistMono = Geist_Mono({
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-geist-mono",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${ptSerif.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="relative antialiased">
        <div className="texture" aria-hidden="true" />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
        >
          <main className="min-h-screen flex flex-col items-center">
            <div className="flex-1 w-full flex flex-col items-center">
              {children}
            </div>
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
