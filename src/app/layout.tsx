import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Hedvig_Letters_Serif, Martian_Mono } from "next/font/google";
import "./globals.css";

const hedvig = Hedvig_Letters_Serif({ variable: "--font-hedvig", subsets: ["latin"], weight: "400" });
const hanken = Hanken_Grotesk({ variable: "--font-hanken", subsets: ["latin"] });
const martian = Martian_Mono({ variable: "--font-martian", subsets: ["latin"], axes: ["wdth"] });

const TITLE = "Radahn — an agent whose memory you can see";
const DESCRIPTION =
  "Radahn keeps what matters from every conversation, uses it to shape its next answer, and shows you exactly which memory did it.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://radahn-ai.vercel.app"),
  title: { default: TITLE, template: "%s · Radahn" },
  description: DESCRIPTION,
  icons: { icon: "/brand/radahn-mark.png" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Radahn",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Radahn — an agent whose memory you can see and steer" }],
    locale: "en_US",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og.png"] },
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
