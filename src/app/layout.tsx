import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Internal tool — deliberately bland title, and noindex so it never appears in
// search. There is nothing public here.
export const metadata: Metadata = {
  title: "speclr",
  description: "Internal tool.",
  robots: { index: false, follow: false },
  // What an installed shortcut or a pinned tab is called. Left unset, both take
  // the `<title>` of whatever page was open when it was pinned, so the same app
  // ends up on the home screen as "speclr", "Dashboard" or "Clients".
  appleWebApp: { title: "speclr" },
};

/*
 * No `themeColor`, deliberately. It would paint the mobile address bar to match
 * `--background`, which is a real improvement on a phone and this is a desktop
 * tool nobody signs into on one. The cost is the part that decides it: the
 * viewport API takes a colour string, not a CSS variable, so it means a second
 * copy of the background in hex with nothing to keep it in step the day the
 * palette moves. `design-tokens.test.ts` refuses hex literals for exactly that
 * reason and refused these. `color-scheme` in `globals.css` already stops the
 * white flash on load, which was the part that mattered here.
 */

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} h-full overflow-x-clip overflow-y-clip antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
