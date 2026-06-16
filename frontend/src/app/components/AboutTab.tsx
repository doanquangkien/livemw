import Image from "next/image";

export default function AboutTab() {
  return (
    <div className="space-y-6">
      {/* Intro Section */}
      <div className="bg-gray-900 border border-gray-800 p-5 shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <Image
            src="/logo.png"
            width={32}
            height={32}
            alt="Logo"
            className="w-8 h-8 object-contain"
          />
          <h2 className="text-lg font-bold text-white tracking-wide">TRẠI GÀ CHÚC CÁT TƯỜNG</h2>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed text-justify">
          Chào mừng anh em đam mê đến với nền tảng Livestream chính thức của <strong>Trại Gà Chúc Cát Tường</strong>. Đây là sân chơi chuyên biệt dành cho những người yêu thích nghệ thuật chăm sóc và vần xổ chiến kê. Nền tảng được xây dựng với mục đích duy nhất: Giao lưu, chia sẻ kinh nghiệm huấn luyện thực chiến và chiêm ngưỡng những pha ra đòn đẹp mắt.
        </p>
      </div>

      {/* Warning Section */}
      <div className="bg-red-950/20 border border-red-900/50 p-5 relative overflow-hidden">
        {/* Accent border line */}
        <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>

        <div className="flex items-center gap-3 mb-3">
          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider">Tuyên Bố Miễn Trừ Trách Nhiệm</h3>
        </div>
        <ul className="text-sm text-gray-400 space-y-2.5 mt-2 list-disc list-inside marker:text-red-600/50">
          <li>
            <strong className="text-red-400">Nghiêm cấm tuyệt đối</strong> mọi hành vi cá cược, cờ bạc, hoặc tổ chức đánh bạc dưới bất kỳ hình thức nào.
          </li>
          <li>
            Nghiêm cấm chia sẻ link lậu, bàn luận chính trị hoặc sử dụng ngôn từ kích động, xúc phạm trong kênh Chat.
          </li>
          <li>
            Mọi cá nhân vi phạm sẽ bị <strong className="text-gray-200">Cấm vĩnh viễn</strong> khỏi hệ thống và tự hoàn toàn chịu trách nhiệm trước pháp luật.
          </li>
        </ul>
      </div>

    </div>
  );
}
