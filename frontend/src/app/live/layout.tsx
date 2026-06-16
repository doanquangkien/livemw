import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const now = new Date();
  const formatted = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(now);

  return {
    title: "Livestream - Trại Gà Chúc Cát Tường",
    description: `Phiên live ngày ${formatted}`,
    metadataBase: new URL("https://live.mecwish.com"),
    openGraph: {
      title: "Livestream - Trại Gà Chúc Cát Tường",
      description: `Phiên live ngày ${formatted}`,
      images: [
        {
          url: "/Cover.png",
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default function LiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
