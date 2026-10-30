import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Hedvig_Letters_Serif, Martian_Mono } from "next/font/google";
import "./globals.css";

const hedvig = Hedvig_Letters_Serif({ variable: "--font-hedvig", subsets: ["latin"], weight: "400" });
const hanken = Hanken_Grotesk({ variable: "--font-hanken", subsets: ["latin"] });
const martian = Martian_Mono({ variable: "--font-martian", subsets: ["latin"], axes: ["wdth"] });

export const metadata: Metadata = {
  title: { default: "Radahn — an agent whose memory you can see", template: "%s · Radahn" },
  description:
    "Radahn keeps what matters from every conversation, uses it to shape its next answer, and shows you exactly which memory did it.",
  icons: { icon: "/brand/radahn-mark.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0e0d0b" },
    { media: "(prefers-color-scheme: light)", color: "#f2f0e8" },
  ],
};

// Runs before paint so a stored theme never flashes the wrong ground.
const themeScript = `try{var t=localStorage.getItem('radahn-theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t}else if(matchMedia('(prefers-color-scheme: light)').matches){document.documentElement.dataset.theme='light'}}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${hedvig.variable} ${hanken.variable} ${martian.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
