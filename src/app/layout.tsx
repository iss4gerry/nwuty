import type { Metadata } from "next";
import { Instrument_Sans, Newsreader } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans-app",
});

const serif = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif-app",
});

export const metadata: Metadata = {
  title: "nwuty",
  description: "Daily nutrition with Mayu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${serif.variable} min-h-full antialiased`}
    >
      <body className="app-backdrop flex min-h-full min-h-dvh flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
