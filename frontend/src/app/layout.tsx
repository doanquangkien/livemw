import type { Metadata } from "next";
import { Be_Vietnam_Pro, Geist_Mono } from "next/font/google";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://live.mecwish.com"),
  title: "Livestream - Trại Gà Chúc Cát Tường",
  description: "Live stream viewer",
  openGraph: {
    title: "Livestream - Trại Gà Chúc Cát Tường",
    description: "Live stream viewer",
    url: "https://live.mecwish.com",
    type: "website",
    images: ["/Cover.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full bg-black text-white">{children}</body>
    </html>
  );
}
