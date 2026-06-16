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
      url: "https://live.mecwish.com/live",
      type: "website",
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

export default function BotCloakPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans p-8 md:p-16 max-w-4xl mx-auto">
      <header className="border-b pb-6 mb-8">
        <h1 className="text-4xl font-bold text-green-800 mb-2">Trại Gà Giống Chúc Cát Tường</h1>
        <p className="text-xl text-gray-600">Mô hình chăn nuôi gia cầm đạt chuẩn VietGAP</p>
      </header>
      
      <main className="space-y-8 text-lg leading-relaxed">
        <section>
          <h2 className="text-2xl font-bold text-green-700 mb-4">1. Lựa chọn giống gà khỏe mạnh</h2>
          <p>
            Để có một đàn gà phát triển tốt, việc lựa chọn con giống ban đầu là yếu tố kiên quyết. Tại trại giống Chúc Cát Tường, 
            chúng tôi áp dụng quy trình chọn lọc nghiêm ngặt, đảm bảo gà con lông mượt, mắt sáng, chân khỏe và không mang mầm bệnh.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-green-700 mb-4">2. Môi trường chăn nuôi sinh thái</h2>
          <p>
            Khác với mô hình nuôi nhốt chật hẹp, trại giống của chúng tôi chú trọng không gian mở. Gà được thả vườn tự do 
            vào ban ngày để vận động, tắm nắng, giúp cơ bắp săn chắc và tăng sức đề kháng tự nhiên. Chuồng trại luôn được 
            vệ sinh sát khuẩn định kỳ 2 lần/tuần bằng chế phẩm sinh học an toàn.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-green-700 mb-4">3. Quy trình tiêm phòng vắc-xin</h2>
          <p>
            An toàn dịch bệnh là ưu tiên hàng đầu. Lịch tiêm phòng các bệnh phổ biến như Gumboro, Newcastle, H5N1 được 
            tuân thủ tuyệt đối dưới sự giám sát của bác sĩ thú y. Thức ăn cung cấp hàng ngày được phối trộn thêm các loại 
            thảo mộc tự nhiên như tỏi, gừng để tăng cường hệ miễn dịch đường ruột cho đàn gia cầm.
          </p>
        </section>
      </main>

      <footer className="mt-16 pt-8 border-t text-center text-gray-500">
        <p>© {new Date().getFullYear()} Trại Gà Chúc Cát Tường. Chuyên kiến thức nông nghiệp bền vững.</p>
      </footer>
    </div>
  );
}
