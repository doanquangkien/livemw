export default function AboutTab() {
  return (
    <div className="space-y-6">
      {/* Intro Section */}
      <div className="bg-gray-900 border border-gray-800 p-5 rounded-lg shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-red-500/10 rounded-md">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white tracking-wide">TRẠI GÀ CHÚC CÁT TƯỜNG</h2>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed text-justify">
          Chào mừng anh em đam mê đến với nền tảng Livestream chính thức của <strong>Trại Gà Chúc Cát Tường</strong>. Đây là sân chơi chuyên biệt dành cho những người yêu thích nghệ thuật chăm sóc và vần xổ chiến kê. Nền tảng được xây dựng với mục đích duy nhất: Giao lưu, chia sẻ kinh nghiệm huấn luyện thực chiến và chiêm ngưỡng những pha ra đòn đẹp mắt.
        </p>
      </div>

      {/* Warning Section */}
      <div className="bg-red-950/20 border border-red-900/50 p-5 rounded-lg relative overflow-hidden">
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
            Mọi cá nhân vi phạm sẽ bị <strong className="text-gray-200">Cấm (Ban) vĩnh viễn</strong> khỏi hệ thống và tự hoàn toàn chịu trách nhiệm trước pháp luật.
          </li>
        </ul>
      </div>

      {/* Footer Info */}
      <div className="flex items-start gap-4 p-4 border border-gray-800 bg-gray-900/40 rounded-lg">
        <div className="p-2 bg-gray-800 rounded-full shrink-0">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white">Xem Lại Video Vần Xổ</h4>
          <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
            Các buổi live vần xổ gà hay sẽ được hệ thống lưu lại. Bạn có thể chuyển sang thẻ <span className="text-gray-300 font-medium px-1">Xem lại</span> bên trên để theo dõi lại các đòn đánh mãn nhãn.
          </p>
        </div>
      </div>
    </div>
  );
}
